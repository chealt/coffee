class CoffeeFilters extends HTMLElement {
  connectedCallback() {
    this.toggleButton = this.querySelector('.toggle-button');
    this.toggleText = this.querySelector('.toggle-text');
    this.clearButton = this.querySelector('.clear-button');
    this.filters = this.querySelector('.filters');
    this.supElement = this.querySelector('sup');

    this.addFilterChangeListeners();
    this.clearFilters();
    this.toggleFilters();
    this.showNumberOfActiveFilters();
  }

  addFilterChangeListeners() {
    this.querySelectorAll('[type=checkbox]').forEach((input) => {
      input.addEventListener('change', () => {
        this.showNumberOfActiveFilters();
      });
    });
  }

  clearFilters() {
    this.clearButton.addEventListener('click', () => {
      this.querySelectorAll('[type=checkbox]').forEach((input) => {
        input.checked = false;
      });
      this.showNumberOfActiveFilters();
    });
  }

  toggleFilters() {
    this.toggleButton.addEventListener('click', () => {
      this.filters.classList.toggle('active');
    });
  }

  showNumberOfActiveFilters() {
    const numberOfActiveFilters = this.querySelectorAll('[type=checkbox]:checked').length;

    if (numberOfActiveFilters === 0) {
      this.supElement.classList.add('hidden');
    } else {
      this.supElement.classList.remove('hidden');
    }

    this.supElement.textContent = numberOfActiveFilters;
  }
}

if (!customElements.get('coffee-filters')) {
  customElements.define('coffee-filters', CoffeeFilters);
}
