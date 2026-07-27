import assert from "node:assert/strict";
import { BlocklistStore, importPayload } from "../src/storage/blocklist-store";

const syncData = new Map<string, unknown>();
let changedKeys: readonly string[] = [];

const mockedBrowser: typeof browser = {
  runtime: {
    getURL: (path: string) => `moz-extension://test/${path}`
  },
  storage: {
    sync: {
      async get(keys?: string | string[] | Record<string, unknown> | null): Promise<Record<string, unknown>> {
        if (typeof keys === "string") {
          return { [keys]: syncData.get(keys) };
        }

        if (Array.isArray(keys)) {
          return Object.fromEntries(keys.map((key) => [key, syncData.get(key)]));
        }

        return Object.fromEntries(syncData);
      },
      async set(items: Record<string, unknown>): Promise<void> {
        changedKeys = Object.keys(items);
        for (const [key, value] of Object.entries(items)) {
          syncData.set(key, value);
        }
      },
      async remove(keys: string | string[]): Promise<void> {
        const normalizedKeys = Array.isArray(keys) ? keys : [keys];
        for (const key of normalizedKeys) {
          syncData.delete(key);
        }
      }
    },
    onChanged: {
      addListener: () => undefined
    }
  },
  tabs: {
    query: async () => []
  },
  webRequest: {
    onBeforeRequest: {
      addListener: () => undefined
    }
  }
};

(globalThis as typeof globalThis & { browser: typeof browser }).browser = mockedBrowser;

const store = new BlocklistStore();

for (let index = 0; index < 450; index += 1) {
  await store.add(`example-${index}.com`);
}

const entries = await store.getEntries();
assert.equal(entries.length, 450);
assert.equal(syncData.has("blocklist"), false);
assert.equal(syncData.has("blocklistMeta"), true);
assert.equal(changedKeys.some((key) => key.startsWith("blocklistChunk:")), true);

await store.createBackup();
await store.clear();
assert.equal((await store.getEntries()).length, 0);

await store.restoreBackup();
assert.equal((await store.getEntries()).length, 450);

const importedFromStrings = importPayload(["https://www.instagram.com", "reddit.com/*"]);
assert.equal(importedFromStrings[0]?.value, "instagram.com");
assert.equal(importedFromStrings[1]?.value, "reddit.com/*");

const importedFromObjects = importPayload({ version: 1, entries: [{ value: "https://m.facebook.com" }] });
assert.equal(importedFromObjects[0]?.value, "facebook.com");

assert.throws(() => importPayload({ entries: ["missing version"] }), /JSON invalido/u);

export {};
