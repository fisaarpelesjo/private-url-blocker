import assert from "node:assert/strict";
import { createBlockIndex, matchUrl } from "../src/blocker/rules";
import type { BlockEntry } from "../src/types/blocklist";
import { normalizeInput } from "../src/utils/normalize";

assert.equal(normalizeInput("https://www.instagram.com").value, "instagram.com");
assert.equal(normalizeInput("https://youtube.com/watch?v=123").value, "youtube.com/watch?v=123");
assert.equal(normalizeInput("HTTPS://WWW.Google.COM/search?q=%40ExampleQuery").value, "google.com/search?q=%40examplequery");
assert.equal(normalizeInput("https://www.google.com/search?q=%40examplequery").value, "google.com/search?q=%40examplequery");
assert.equal(normalizeInput("https://m.facebook.com").value, "facebook.com");
assert.equal(normalizeInput("*.google.com").value, "*.google.com");
assert.equal(normalizeInput("reddit.com/*").value, "reddit.com/*");
assert.equal(normalizeInput("keyword:BlockedTerm").value, "keyword:blockedterm");
assert.equal(normalizeInput("https://www.youtube.com/shorts").value, "youtube.com/shorts");
assert.equal(
  normalizeInput("https://www.google.com/search?client=firefox-b-d&q=example-query").value,
  "google.com/search?client=firefox-b-d&q=example-query"
);

const entries: readonly BlockEntry[] = [
  entry("instagram.com"),
  entry("*.google.com"),
  entry("reddit.com/*"),
  entry("youtube.com/shorts"),
  entry("google.com/search?client=firefox-b-d&q=example-query"),
  entry("google.com/search?q=%40ExampleQuery"),
  entry("keyword:blockedterm"),
  entry("keyword:sample phrase")
];
const index = createBlockIndex(entries);

assert.equal(matchUrl("https://instagram.com/", index).blocked, true);
assert.equal(matchUrl("https://www.instagram.com/profile", index).blocked, true);
assert.equal(matchUrl("https://mail.google.com/", index).blocked, true);
assert.equal(matchUrl("https://google.com/", index).blocked, false);
assert.equal(matchUrl("https://reddit.com/r/firefox", index).blocked, true);
assert.equal(matchUrl("https://youtube.com/shorts/abc", index).blocked, true);
assert.equal(matchUrl("https://youtube.com/watch?v=abc", index).blocked, false);
assert.equal(matchUrl("https://www.google.com/search?client=firefox-b-d&q=example-query", index).blocked, true);
assert.equal(matchUrl("https://www.google.com/search?client=firefox-b-d&q=outra", index).blocked, false);
assert.equal(matchUrl("https://www.google.com/search?q=%40ExampleQuery", index).blocked, true);
assert.equal(matchUrl("https://www.google.com/search?q=%40examplequery", index).blocked, true);
assert.equal(matchUrl("https://www.google.com/search?q=prefix+blockedterm&client=firefox-b-d&udm=2", index).blocked, true);
assert.equal(matchUrl("https://www.google.com/search?q=prefix+allowedterm&client=firefox-b-d", index).blocked, false);
assert.equal(matchUrl("https://www.google.com/search?q=sample+phrase&client=firefox-b-d", index).blocked, true);
assert.equal(matchUrl("https://www.youtube.com/results?search_query=prefix+blockedterm", index).blocked, true);
assert.equal(matchUrl("moz-extension://abc/blocked.html", index).blocked, false);

function entry(value: string): BlockEntry {
  return {
    id: value,
    value,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z"
  };
}
