class i18nContainer extends HTMLElement {
  async connectedCallback() {
    this.locale = this.dataset.locale;
    this.translations = {};

    if (!this.locale) {
      throw new Error('You must provide a locale using the [data-locale] attribute');
    }

    await this.loadTranslations();
    this.setTranslationStatus();
  }

  async loadTranslations() {
    const response = await fetch('/api/i18n/getAll.json', {
      method: 'POST',
      body: JSON.stringify({ locale: this.locale })
    });

    const translations = await response.json();

    if (translations?.length) {
      this.translations = translations.reduce((map, { namespace, key, value }) => {
        map[namespace] = map[namespace] || {};
        map[namespace][key] = value;

        return map;
      }, {});
    }
  }

  setTranslationStatus() {
    this.closest('body')
      .querySelectorAll('chealt-translation')
      .forEach((element) => {
        const { namespace, key } = element.dataset;

        if (this.translations[namespace]?.[key] && element.textContent === this.translations[namespace][key]) {
          element.classList.remove('not-translated');
          element.classList.remove('not-published');
        } else if (this.translations[namespace]?.[key]) {
          element.classList.remove('not-translated');
          element.classList.add('not-published');
          element.textContent = this.translations[namespace][key];
        } else {
          element.classList.remove('not-published');
          element.classList.add('not-translated');
        }
      });
  }
}

if (!customElements.get('chealt-i18n-container')) {
  customElements.define('chealt-i18n-container', i18nContainer);
}
