import { BlocklistStore } from "../storage/blocklist-store";
import type { BlockEntry } from "../types/blocklist";
import { requiredElement, setMessage } from "../utils/dom";
import { normalizeInput } from "../utils/normalize";

const store = new BlocklistStore();

const addForm = requiredElement("add-form", HTMLFormElement);
const blockInput = requiredElement("block-input", HTMLInputElement);
const countElement = requiredElement("item-count", HTMLSpanElement);
const messageElement = requiredElement("message", HTMLDivElement);
const currentDomainElement = requiredElement("current-domain", HTMLElement);
const blockCurrentButton = requiredElement("block-current-button", HTMLButtonElement);

let entries: readonly BlockEntry[] = [];
let currentDomain: string | null = null;

addForm.addEventListener("submit", (event) => {
  event.preventDefault();
  void addEntry();
});

blockCurrentButton.addEventListener("click", () => {
  void blockCurrentDomain();
});

store.onChanged(() => {
  void loadEntries();
});

void loadEntries();
void loadCurrentDomain();

async function loadEntries(): Promise<void> {
  entries = await store.getEntries();
  renderCount();
}

async function addEntry(): Promise<void> {
  try {
    entries = await store.add(blockInput.value);
    blockInput.value = "";
    setMessage(messageElement, "Item adicionado.");
    renderCount();
  } catch (error) {
    setMessage(messageElement, error instanceof Error ? error.message : "Nao foi possivel adicionar.", true);
  }
}

async function loadCurrentDomain(): Promise<void> {
  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  const activeTab = tabs[0];

  if (activeTab?.url === undefined) {
    renderCurrentDomain(null);
    return;
  }

  try {
    const normalized = normalizeInput(activeTab.url).value;
    renderCurrentDomain(normalized);
  } catch {
    renderCurrentDomain(null);
  }
}

async function blockCurrentDomain(): Promise<void> {
  if (currentDomain === null) {
    return;
  }

  try {
    entries = await store.add(currentDomain);
    setMessage(messageElement, `${currentDomain} bloqueado.`);
    renderCount();
  } catch (error) {
    setMessage(messageElement, error instanceof Error ? error.message : "Nao foi possivel bloquear a pagina atual.", true);
  }
}

function renderCurrentDomain(domain: string | null): void {
  currentDomain = domain;
  currentDomainElement.textContent = domain ?? "Nao detectada";
  blockCurrentButton.disabled = domain === null;
}

function renderCount(): void {
  countElement.textContent = String(entries.length);
}
