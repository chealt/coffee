class CoffeeReview extends HTMLElement {
  connectedCallback() {
    this.form = this.querySelector('form');
    this.dialog = this.querySelector('dialog');

    this.observeNameChange();
    this.setFormName();
  }

  setFormName() {
    if (this.dataset.dbAttrName) {
      this.form.setAttribute('name', this.dataset.dbAttrName);
    }
  }

  observeNameChange() {
    const observer = new MutationObserver(this.setFormName.bind(this));

    observer.observe(this, { attributes: true, attributeFilter: ['data-db-attr-name'] });
  }
}

if (!customElements.get('coffee-review')) {
  customElements.define('coffee-review', CoffeeReview);
}
