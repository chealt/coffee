class Translation extends HTMLElement {
  connectedCallback() {
    this.namespace = this.dataset.namespace;
    this.key = this.dataset.key;
    this.locale = this.dataset.locale;

    if (!this.namespace) {
      throw new Error('Missing namespace, please add data attribute [data-namespace]');
    }

    if (!this.key) {
      throw new Error('Missing key, please add data attribute [data-key]');
    }

    if (!this.locale) {
      throw new Error('Missing locale, please add data attribute [data-locale]');
    }

    this.addEventListener('input', this.update.bind(this));
  }

  update(event) {
    if (this.callbackID) {
      cancelIdleCallback(this.callbackID);
    }

    const text = event.target.textContent;

    this.callbackID = requestIdleCallback(async () => {
      await fetch('/api/i18n/translate.json', {
        method: 'POST',
        body: JSON.stringify({ namespace: this.namespace, key: this.key, value: text, locale: this.locale })
      });
    });
  }
}

if (!customElements.get('chealt-translation')) {
  customElements.define('chealt-translation', Translation);
}
