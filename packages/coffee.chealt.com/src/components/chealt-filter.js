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
  }

  filterElements() {
    const searchTerm = this.searchInput.value.toLowerCase();

    this.elementsToFilter.forEach((element) => {
      const elementText = element.textContent.toLowerCase();

      if (elementText.includes(searchTerm)) {
        element.style.display = 'block';
      } else {
        element.style.display = 'none';
      }
    });
  }
}

if (!customElements.get('chealt-filter')) {
  customElements.define('chealt-filter', ChealtFilter);
}
