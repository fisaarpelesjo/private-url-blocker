import { createBlockIndex, matchUrl, type BlockIndex } from "../blocker/rules";
import { BlocklistStore } from "../storage/blocklist-store";

const store = new BlocklistStore();
let index: BlockIndex = createBlockIndex([]);

void refreshIndex();
store.onChanged(() => {
  void refreshIndex();
});

browser.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (details.type !== "main_frame") {
      return {};
    }

    if (details.url.startsWith(browser.runtime.getURL(""))) {
      return {};
    }

    const result = matchUrl(details.url, index);
    if (!result.blocked) {
      return {};
    }

    const blockedPage = browser.runtime.getURL(`blocked.html?rule=${encodeURIComponent(result.rule ?? "desconhecido")}`);
    return { redirectUrl: blockedPage };
  },
  { urls: ["<all_urls>"] },
  ["blocking"]
);

async function refreshIndex(): Promise<void> {
  const entries = await store.getEntries();
  index = createBlockIndex(entries);
}
