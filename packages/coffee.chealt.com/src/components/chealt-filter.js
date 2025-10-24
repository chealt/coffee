class ChealtFilter extends HTMLElement {
  connectedCallback() {
    this.searchInput = this.querySelector('input');

    if (!this.dataset.filterSelector) {
      throw new Error(
        'No filter selector provided, please add "data-filter-selector" attribute to the <chealt-filter> component.'
      );
    }

    this.elementsToFilter = document.querySelectorAll(this.dataset.filterSelector);

    if (!this.elementsToFilter.length) {
      throw new Error(`No elements found matching the selector "${this.dataset.filterSelector}".`);
    }

    this.searchInput.addEventListener('input', this.filterElements.bind(this));
    this.searchInput.addEventListener('keyup', this.selectOption.bind(this));
  }

  filterElements() {
    const searchTerm = this.searchInput.value.toLowerCase();

    this.elementsToFilter.forEach((element) => {
      const elementText = element.textContent.toLowerCase();

      if (elementText.includes(searchTerm)) {
        element.style.display = 'block';
        element.ariaHidden = false;
      } else {
        element.style.display = 'none';
        element.ariaHidden = true;
      }
    });
  }

  selectOption(event) {
    if (event.key === 'ArrowDown') {
      const firstOption = this.closest('dialog')?.querySelector('[role=option]:not([aria-hidden="true"])');

      firstOption?.focus();
    } else if (event.key === 'ArrowUp') {
      const visibleOptions = this.closest('dialog')?.querySelectorAll('[role=option]:not([aria-hidden="true"])');
      const lastOption = Array.from(visibleOptions)[visibleOptions.length - 1];

      lastOption?.focus();
    }
  }
}

if (!customElements.get('chealt-filter')) {
  customElements.define('chealt-filter', ChealtFilter);
}
