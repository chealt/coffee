class ChealtToggle extends HTMLElement {
  connectedCallback() {
    this.triggers = this.querySelectorAll('[data-trigger],[data-trigger-selector]');

    this.toggleOnTriggerClick();
  }

  toggleOnTriggerClick() {
    this.triggers?.forEach((element) => {
      element.addEventListener('click', (event) => {
        event.preventDefault();

        const { trigger, triggerSelector } = element.dataset;

        this.querySelectorAll(trigger ? '[data-content]' : triggerSelector).forEach((contentElement) => {
          contentElement.classList.toggle('visible');
        });
      });
    });
  }
}

if (!customElements.get('chealt-toggle')) {
  customElements.define('chealt-toggle', ChealtToggle);
}
