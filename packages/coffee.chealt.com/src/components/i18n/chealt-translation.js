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

    this.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
    });
    this.addEventListener('input', this.update.bind(this));
  }

  update(event) {
    const text = event.target.textContent;

    fetch('/api/i18n/translate.json', {
      method: 'POST',
      body: JSON.stringify({ namespace: this.namespace, key: this.key, value: text, locale: this.locale })
    });

    if (this.textUpdateCallbackID) {
      cancelIdleCallback(this.callbackID);
    }

    this.textUpdateCallbackID = requestIdleCallback(() => {
      document
        .querySelectorAll(`chealt-translation[data-namespace="${this.namespace}"][data-key="${this.key}"]`)
        .forEach((element) => {
          if (!element.classList.contains('not-published')) {
            element.classList.remove('not-translated');
            element.classList.add('not-published');
          }

          if (element !== event.target) {
            element.textContent = text;
          }
        });
    });
  }
}

if (!customElements.get('chealt-translation')) {
  customElements.define('chealt-translation', Translation);
}
