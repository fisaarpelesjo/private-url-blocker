import type { BlockEntry, BlocklistBackup, BlocklistPayload } from "../types/blocklist";
import { createId } from "../utils/id";
import { normalizeInput } from "../utils/normalize";

const BLOCKLIST_KEY = "blocklist";
const BACKUP_KEY = "blocklistBackup";
const BLOCKLIST_META_KEY = "blocklistMeta";
const BLOCKLIST_CHUNK_PREFIX = "blocklistChunk:";
const BACKUP_META_KEY = "blocklistBackupMeta";
const BACKUP_CHUNK_PREFIX = "blocklistBackupChunk:";
const EMPTY_PAYLOAD: BlocklistPayload = { version: 1, entries: [] };
const MAX_CHUNK_BYTES = 7_000;
const SAFE_SYNC_PAYLOAD_BYTES = 90_000;

export class BlocklistStore {
  async getEntries(): Promise<readonly BlockEntry[]> {
    const payload = await this.getPayload();
    return payload.entries;
  }

  async add(rawValue: string): Promise<readonly BlockEntry[]> {
    const normalized = normalizeInput(rawValue).value;
    const payload = await this.getPayload();

    if (payload.entries.some((entry) => entry.value === normalized)) {
      throw new Error("Este item ja existe na lista.");
    }

    const now = new Date().toISOString();
    const nextEntries = [
      ...payload.entries,
      {
        id: createId(),
        value: normalized,
        createdAt: now,
        updatedAt: now
      }
    ].sort(compareEntries);

    await this.setEntries(nextEntries);
    return nextEntries;
  }

  async update(id: string, rawValue: string): Promise<readonly BlockEntry[]> {
    const normalized = normalizeInput(rawValue).value;
    const payload = await this.getPayload();
    const duplicate = payload.entries.find((entry) => entry.id !== id && entry.value === normalized);

    if (duplicate !== undefined) {
      throw new Error("Este item ja existe na lista.");
    }

    const now = new Date().toISOString();
    const nextEntries = payload.entries
      .map((entry) => (entry.id === id ? { ...entry, value: normalized, updatedAt: now } : entry))
      .sort(compareEntries);

    await this.setEntries(nextEntries);
    return nextEntries;
  }

  async remove(id: string): Promise<readonly BlockEntry[]> {
    const payload = await this.getPayload();
    const nextEntries = payload.entries.filter((entry) => entry.id !== id);
    await this.setEntries(nextEntries);
    return nextEntries;
  }

  async replace(entries: readonly BlockEntry[]): Promise<readonly BlockEntry[]> {
    const normalizedEntries = normalizeImportedEntries(entries);
    await this.setEntries(normalizedEntries);
    return normalizedEntries;
  }

  async clear(): Promise<void> {
    await this.setEntries([]);
  }

  async createBackup(): Promise<BlocklistBackup> {
    const entries = await this.getEntries();
    const backup: BlocklistBackup = {
      version: 1,
      createdAt: new Date().toISOString(),
      entries
    };
    await setChunkedEntries(BACKUP_META_KEY, BACKUP_CHUNK_PREFIX, entries, { createdAt: backup.createdAt });
    return backup;
  }

  async restoreBackup(): Promise<readonly BlockEntry[]> {
    const backup = await this.getBackup();

    if (backup === null) {
      throw new Error("Nenhum backup encontrado.");
    }

    await this.setEntries(backup.entries);
    return backup.entries;
  }

  onChanged(callback: () => void): void {
    browser.storage.onChanged.addListener((changes, areaName) => {
      const changedKeys = Object.keys(changes);
      const blocklistChanged = changedKeys.some(
        (key) => key === BLOCKLIST_KEY || key === BLOCKLIST_META_KEY || key.startsWith(BLOCKLIST_CHUNK_PREFIX)
      );

      if (areaName === "sync" && blocklistChanged) {
        callback();
      }
    });
  }

  private async getPayload(): Promise<BlocklistPayload> {
    const chunkedPayload = await getChunkedPayload(BLOCKLIST_META_KEY, BLOCKLIST_CHUNK_PREFIX);
    if (chunkedPayload !== null) {
      return chunkedPayload;
    }

    const values = await browser.storage.sync.get(BLOCKLIST_KEY);
    return parsePayload(values[BLOCKLIST_KEY]);
  }

  private async setEntries(entries: readonly BlockEntry[]): Promise<void> {
    await setChunkedEntries(BLOCKLIST_META_KEY, BLOCKLIST_CHUNK_PREFIX, entries);
  }

  private async getBackup(): Promise<BlocklistBackup | null> {
    const chunkedBackup = await getChunkedBackup(BACKUP_META_KEY, BACKUP_CHUNK_PREFIX);
    if (chunkedBackup !== null) {
      return chunkedBackup;
    }

    const values = await browser.storage.sync.get(BACKUP_KEY);
    return parseBackup(values[BACKUP_KEY]);
  }
}

export function exportPayload(entries: readonly BlockEntry[]): BlocklistPayload {
  return {
    version: 1,
    entries
  };
}

export function importPayload(value: unknown): readonly BlockEntry[] {
  return normalizeImportedEntries(parseImportEntries(value));
}

function parsePayload(value: unknown): BlocklistPayload {
  if (!isRecord(value) || value.version !== 1 || !Array.isArray(value.entries)) {
    return EMPTY_PAYLOAD;
  }

  const entries = value.entries.filter(isBlockEntry).sort(compareEntries);
  return { version: 1, entries };
}

function parseBackup(value: unknown): BlocklistBackup | null {
  if (!isRecord(value) || value.version !== 1 || typeof value.createdAt !== "string" || !Array.isArray(value.entries)) {
    return null;
  }

  return {
    version: 1,
    createdAt: value.createdAt,
    entries: value.entries.filter(isBlockEntry).sort(compareEntries)
  };
}

async function getChunkedPayload(metaKey: string, chunkPrefix: string): Promise<BlocklistPayload | null> {
  const values = await browser.storage.sync.get(metaKey);
  const meta = parseChunkMeta(values[metaKey]);

  if (meta === null) {
    return null;
  }

  const chunkKeys = createChunkKeys(chunkPrefix, meta.chunkCount);
  const chunkValues = await browser.storage.sync.get([...chunkKeys]);
  const entries = chunkKeys.flatMap((key) => parseChunk(chunkValues[key]));

  return {
    version: 1,
    entries: entries.sort(compareEntries)
  };
}

async function getChunkedBackup(metaKey: string, chunkPrefix: string): Promise<BlocklistBackup | null> {
  const values = await browser.storage.sync.get(metaKey);
  const meta = parseChunkMeta(values[metaKey]);

  if (meta === null || typeof meta.createdAt !== "string") {
    return null;
  }

  const payload = await getChunkedPayload(metaKey, chunkPrefix);
  if (payload === null) {
    return null;
  }

  return {
    version: 1,
    createdAt: meta.createdAt,
    entries: payload.entries
  };
}

async function setChunkedEntries(
  metaKey: string,
  chunkPrefix: string,
  entries: readonly BlockEntry[],
  metadata: Record<string, unknown> = {}
): Promise<void> {
  assertSyncPayloadSize(entries);

  const currentValues = await browser.storage.sync.get(metaKey);
  const currentMeta = parseChunkMeta(currentValues[metaKey]);
  const chunks = chunkEntries(entries);
  const items: Record<string, unknown> = {
    [metaKey]: {
      version: 1,
      chunkCount: chunks.length,
      updatedAt: new Date().toISOString(),
      ...metadata
    }
  };

  chunks.forEach((chunk, index) => {
    items[`${chunkPrefix}${index}`] = chunk;
  });

  await browser.storage.sync.set(items);

  const staleKeys = createStaleChunkKeys(chunkPrefix, chunks.length, currentMeta?.chunkCount ?? 0);
  await browser.storage.sync.remove([BLOCKLIST_KEY, BACKUP_KEY, ...staleKeys]);
}

function chunkEntries(entries: readonly BlockEntry[]): readonly (readonly BlockEntry[])[] {
  const chunks: BlockEntry[][] = [];
  let currentChunk: BlockEntry[] = [];

  for (const entry of entries) {
    const candidate = [...currentChunk, entry];
    if (currentChunk.length > 0 && byteLength(JSON.stringify(candidate)) > MAX_CHUNK_BYTES) {
      chunks.push(currentChunk);
      currentChunk = [entry];
      continue;
    }

    currentChunk = candidate;
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  return chunks;
}

function assertSyncPayloadSize(entries: readonly BlockEntry[]): void {
  const estimatedBytes = byteLength(JSON.stringify(entries));
  if (estimatedBytes > SAFE_SYNC_PAYLOAD_BYTES) {
    throw new Error("A lista excede o limite seguro do Firefox Sync. Exporte um backup e reduza a lista.");
  }
}

function parseChunkMeta(value: unknown): ({ readonly version: 1; readonly chunkCount: number } & Record<string, unknown>) | null {
  if (!isRecord(value) || value.version !== 1 || typeof value.chunkCount !== "number" || !Number.isInteger(value.chunkCount)) {
    return null;
  }

  return {
    ...value,
    version: 1,
    chunkCount: value.chunkCount
  };
}

function parseChunk(value: unknown): readonly BlockEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isBlockEntry);
}

function createChunkKeys(prefix: string, chunkCount: number): readonly string[] {
  return Array.from({ length: chunkCount }, (_, index) => `${prefix}${index}`);
}

function createStaleChunkKeys(prefix: string, nextCount: number, previousCount: number): readonly string[] {
  if (previousCount <= nextCount) {
    return [];
  }

  return Array.from({ length: previousCount - nextCount }, (_, index) => `${prefix}${nextCount + index}`);
}

function byteLength(value: string): number {
  return new Blob([value]).size;
}

function normalizeImportedEntries(entries: readonly BlockEntry[]): readonly BlockEntry[] {
  const seen = new Set<string>();
  const normalizedEntries: BlockEntry[] = [];

  for (const entry of entries) {
    const value = normalizeInput(entry.value).value;
    if (seen.has(value)) {
      continue;
    }

    seen.add(value);
    normalizedEntries.push({
      ...entry,
      value
    });
  }

  return normalizedEntries.sort(compareEntries);
}

function parseImportEntries(value: unknown): readonly BlockEntry[] {
  if (Array.isArray(value)) {
    return value.map(parseImportEntry);
  }

  if (isRecord(value) && value.version === 1 && Array.isArray(value.entries)) {
    return value.entries.map(parseImportEntry);
  }

  throw new Error("JSON invalido. Importe um array de dominios ou um backup exportado pela extensao.");
}

function parseImportEntry(value: unknown): BlockEntry {
  if (typeof value === "string") {
    return createImportedEntry(value);
  }

  if (isBlockEntry(value)) {
    return value;
  }

  if (isRecord(value) && typeof value.value === "string") {
    return createImportedEntry(value.value);
  }

  throw new Error("JSON invalido. Cada item precisa ser texto ou objeto com campo value.");
}

function createImportedEntry(value: string): BlockEntry {
  const now = new Date().toISOString();
  return {
    id: createId(),
    value,
    createdAt: now,
    updatedAt: now
  };
}

function isBlockEntry(value: unknown): value is BlockEntry {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.value === "string" &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function compareEntries(left: BlockEntry, right: BlockEntry): number {
  return left.value.localeCompare(right.value);
}
