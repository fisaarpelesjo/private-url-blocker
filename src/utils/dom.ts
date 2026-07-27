export function requiredElement<T extends HTMLElement>(id: string, type: { new (): T }): T {
  const element = document.getElementById(id);
  if (element instanceof type) {
    return element;
  }

  throw new Error(`Elemento obrigatorio nao encontrado: ${id}`);
}

export function setMessage(element: HTMLElement, message: string, isError = false): void {
  element.textContent = message;
  element.classList.toggle("error", isError);
}
