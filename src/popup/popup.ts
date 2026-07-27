import { BlocklistStore } from "../storage/blocklist-store";
import type { BlockEntry } from "../types/blocklist";
import { requiredElement, setMessage } from "../utils/dom";
import { normalizeInput } from "../utils/normalize";

const store = new BlocklistStore();

const addForm = requiredElement("add-form", HTMLFormElement);
const blockInput = requiredElement("block-input", HTMLInputElement);
const searchInput = requiredElement("search-input", HTMLInputElement);
const listElement = requiredElement("block-list", HTMLUListElement);
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

searchInput.addEventListener("input", render);
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
  render();
}

async function addEntry(): Promise<void> {
  try {
    entries = await store.add(blockInput.value);
    blockInput.value = "";
    setMessage(messageElement, "Item adicionado.");
    render();
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
    render();
  } catch (error) {
    setMessage(messageElement, error instanceof Error ? error.message : "Nao foi possivel bloquear a pagina atual.", true);
  }
}

function renderCurrentDomain(domain: string | null): void {
  currentDomain = domain;
  currentDomainElement.textContent = domain ?? "Nao detectada";
  blockCurrentButton.disabled = domain === null;
}

function render(): void {
  const query = searchInput.value.trim().toLowerCase();
  const visibleEntries = query.length === 0 ? entries : entries.filter((entry) => entry.value.includes(query));

  countElement.textContent = String(entries.length);
  listElement.replaceChildren(...visibleEntries.map(createEntryElement));
}

function createEntryElement(entry: BlockEntry): HTMLLIElement {
  const item = document.createElement("li");
  item.className = "rule-item";

  const value = document.createElement("code");
  value.textContent = entry.value;

  const editButton = document.createElement("button");
  editButton.type = "button";
  editButton.textContent = "Editar";
  editButton.addEventListener("click", () => {
    void editEntry(entry);
  });

  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.textContent = "Remover";
  removeButton.className = "danger";
  removeButton.addEventListener("click", () => {
    void removeEntry(entry.id);
  });

  item.append(value, editButton, removeButton);
  return item;
}

async function editEntry(entry: BlockEntry): Promise<void> {
  const nextValue = prompt("Editar item bloqueado", entry.value);
  if (nextValue === null) {
    return;
  }

  try {
    entries = await store.update(entry.id, nextValue);
    setMessage(messageElement, "Item atualizado.");
    render();
  } catch (error) {
    setMessage(messageElement, error instanceof Error ? error.message : "Nao foi possivel editar.", true);
  }
}

async function removeEntry(id: string): Promise<void> {
  entries = await store.remove(id);
  setMessage(messageElement, "Item removido.");
  render();
}
