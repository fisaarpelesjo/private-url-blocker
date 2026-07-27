import type { BlockEntry, BlocklistBackup, BlocklistPayload } from "../types/blocklist";
import { createId } from "../utils/id";
import { normalizeInput } from "../utils/normalize";

const BLOCKLIST_KEY = "blocklist";
const BACKUP_KEY = "blocklistBackup";
const EMPTY_PAYLOAD: BlocklistPayload = { version: 1, entries: [] };

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
    await browser.storage.sync.set({ [BACKUP_KEY]: backup });
    return backup;
  }

  async restoreBackup(): Promise<readonly BlockEntry[]> {
    const values = await browser.storage.sync.get(BACKUP_KEY);
    const backup = parseBackup(values[BACKUP_KEY]);

    if (backup === null) {
      throw new Error("Nenhum backup encontrado.");
    }

    await this.setEntries(backup.entries);
    return backup.entries;
  }

  onChanged(callback: () => void): void {
    browser.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === "sync" && BLOCKLIST_KEY in changes) {
        callback();
      }
    });
  }

  private async getPayload(): Promise<BlocklistPayload> {
    const values = await browser.storage.sync.get(BLOCKLIST_KEY);
    return parsePayload(values[BLOCKLIST_KEY]);
  }

  private async setEntries(entries: readonly BlockEntry[]): Promise<void> {
    const payload: BlocklistPayload = {
      version: 1,
      entries
    };
    await browser.storage.sync.set({ [BLOCKLIST_KEY]: payload });
  }
}

export function exportPayload(entries: readonly BlockEntry[]): BlocklistPayload {
  return {
    version: 1,
    entries
  };
}

export function importPayload(value: unknown): readonly BlockEntry[] {
  const payload = parsePayload(value);
  return normalizeImportedEntries(payload.entries);
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
