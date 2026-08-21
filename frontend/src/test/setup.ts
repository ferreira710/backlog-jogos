import "@testing-library/jest-dom/vitest";

// jsdom ainda não implementa o modal nativo. O polyfill cobre o que os testes
// observam (abrir, fechar, Esc); o comportamento real de foco preso e backdrop
// fica por conta do browser.
if (!HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.open = false;
    this.dispatchEvent(new Event("close"));
  };
}
