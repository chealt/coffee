class CoffeeReview extends HTMLElement {
  connectedCallback() {
    this.form = this.querySelector('form');
    this.dialog = this.querySelector('dialog');

    this.observeNameChange();
    this.setFormName();
  }

  setFormName() {
    if (this.dataset.name) {
      this.form.setAttribute('name', this.dataset.name);
    }
  }

  observeNameChange() {
    const observer = new MutationObserver(this.setFormName.bind(this));

    observer.observe(this, { attributes: true, attributeFilter: ['data-name'] });
  }
}

if (!customElements.get('coffee-review')) {
  customElements.define('coffee-review', CoffeeReview);
}
