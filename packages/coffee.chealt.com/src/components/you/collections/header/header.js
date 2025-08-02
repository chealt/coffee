class CoffeeCollectionHeader extends HTMLElement {
  connectedCallback() {
    this.renameTrigger = this.querySelector('[data-rename-trigger]');

    this.renameTrigger.addEventListener('click', this.rename.bind(this));
  }

  rename() {
    const dialog = this.renameTrigger.closest('dialog');

    if (dialog) {
      dialog.close();
    }

    this.querySelector('[data-attr-name]').focus();
  }
}

if (!customElements.get('coffee-collection-header')) {
  customElements.define('coffee-collection-header', CoffeeCollectionHeader);
}
