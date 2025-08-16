class CoffeeBackNavigation extends HTMLElement {
  connectedCallback() {
    const backButton = this.querySelector('[href]');

    backButton.addEventListener('click', (event) => {
      const fromCollections = window.location.search.includes('from=collections');

      if (!this.hasChanges && fromCollections) {
        event.preventDefault();

        window.history.back();
      }
    });

    document.addEventListener('coffee:collections:change', () => {
      this.hasChanges = true;
    });
  }
}

if (!customElements.get('coffee-back-navigation')) {
  customElements.define('coffee-back-navigation', CoffeeBackNavigation);
}
