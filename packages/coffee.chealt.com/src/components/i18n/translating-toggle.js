class TranslatingToggle extends HTMLElement {
  connectedCallback() {
    this.checkbox = this.querySelector('[data-translating-toggle]');

    this.checkbox.addEventListener('change', (event) => {
      navigator.serviceWorker?.controller?.postMessage({
        action: 'toggle-translating',
        isTranslating: event.target.checked
      });
    });
  }
}

if (!customElements.get('chealt-i18n-toggle')) {
  customElements.define('chealt-i18n-toggle', TranslatingToggle);
}
