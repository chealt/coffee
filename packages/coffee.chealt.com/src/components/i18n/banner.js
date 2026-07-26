class Banner extends HTMLElement {
  connectedCallback() {
    this.handler = this.querySelector('.handler');
    this.moveHandler = this.querySelector('[data-move]');
    this.stopHandler = this.querySelector('[data-stop-translating]');

    this.handler.addEventListener('click', () => {
      this.classList.toggle('open');
    });

    this.moveHandler.addEventListener('click', () => {
      this.classList.toggle('bottom');
    });

    this.stopHandler.addEventListener('click', () => {
      navigator.serviceWorker?.controller?.postMessage({ action: 'toggle-translating', isTranslating: false });
    });
  }
}

if (!customElements.get('chealt-i18n-banner')) {
  customElements.define('chealt-i18n-banner', Banner);
}
