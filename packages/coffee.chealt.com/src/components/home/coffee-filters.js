class CoffeeFilters extends HTMLElement {
  connectedCallback() {
    this.toggleButton = this.querySelector('.toggle-button');
    this.clearButton = this.querySelector('.clear-button');
    this.filters = this.querySelector('.filters');

    this.clearFilters();
    this.toggleFilters();
  }

  clearFilters() {
    this.clearButton.addEventListener('click', () => {
      this.querySelectorAll('[type=checkbox]').forEach((input) => {
        input.checked = false;
      });
    });
  }

  toggleFilters() {
    this.toggleButton.addEventListener('click', () => {
      this.filters.classList.toggle('active');
    });
  }
}

if (!customElements.get('coffee-filters')) {
  customElements.define('coffee-filters', CoffeeFilters);
}
