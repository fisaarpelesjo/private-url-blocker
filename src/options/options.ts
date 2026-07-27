import { BlocklistStore, exportPayload, importPayload } from "../storage/blocklist-store";
import type { BlockEntry } from "../types/blocklist";
import { requiredElement, setMessage } from "../utils/dom";

const store = new BlocklistStore();

const addForm = requiredElement("add-form", HTMLFormElement);
const blockInput = requiredElement("block-input", HTMLInputElement);
const searchInput = requiredElement("search-input", HTMLInputElement);
const listElement = requiredElement("block-list", HTMLUListElement);
const countElement = requiredElement("item-count", HTMLSpanElement);
const messageElement = requiredElement("message", HTMLDivElement);
const exportButton = requiredElement("export-button", HTMLButtonElement);
const importButton = requiredElement("import-button", HTMLButtonElement);
const backupButton = requiredElement("backup-button", HTMLButtonElement);
const restoreButton = requiredElement("restore-button", HTMLButtonElement);
const clearButton = requiredElement("clear-button", HTMLButtonElement);
const fileInput = requiredElement("file-input", HTMLInputElement);

let entries: readonly BlockEntry[] = [];

addForm.addEventListener("submit", (event) => {
  event.preventDefault();
  void addEntry();
});

searchInput.addEventListener("input", render);
exportButton.addEventListener("click", exportJson);
importButton.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", () => {
  void importJson();
});
backupButton.addEventListener("click", () => {
  void createBackup();
});
restoreButton.addEventListener("click", () => {
  void restoreBackup();
});
clearButton.addEventListener("click", () => {
  void clearEntries();
});

store.onChanged(() => {
  void loadEntries();
});

void loadEntries();

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

function exportJson(): void {
  const payload = JSON.stringify(exportPayload(entries), null, 2);
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `url-blocker-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
  setMessage(messageElement, "Arquivo exportado.");
}

async function importJson(): Promise<void> {
  const file = fileInput.files?.[0];
  fileInput.value = "";

  if (file === undefined) {
    return;
  }

  try {
    const text = await file.text();
    const importedEntries = importPayload(JSON.parse(text) as unknown);
    entries = await store.replace(importedEntries);
    setMessage(messageElement, "Lista importada.");
    render();
  } catch (error) {
    setMessage(messageElement, error instanceof Error ? error.message : "JSON invalido.", true);
  }
}

async function createBackup(): Promise<void> {
  await store.createBackup();
  setMessage(messageElement, "Backup criado no storage.sync.");
}

async function restoreBackup(): Promise<void> {
  try {
    entries = await store.restoreBackup();
    setMessage(messageElement, "Backup restaurado.");
    render();
  } catch (error) {
    setMessage(messageElement, error instanceof Error ? error.message : "Nao foi possivel restaurar.", true);
  }
}

async function clearEntries(): Promise<void> {
  if (!confirm("Limpar toda a lista de bloqueios?")) {
    return;
  }

  await store.clear();
  entries = [];
  setMessage(messageElement, "Lista limpa.");
  render();
}
