class ChealtToggle extends HTMLElement {
  connectedCallback() {
    this.trigger = this.querySelector('[data-trigger]');
    this.content = this.querySelector('[data-content]');

    this.toggleOnTriggerClick();
  }

  toggleOnTriggerClick() {
    this.trigger.addEventListener('click', (event) => {
      event.preventDefault();

      this.content.classList.toggle('visible');
    });
  }
}

if (!customElements.get('chealt-toggle')) {
  customElements.define('chealt-toggle', ChealtToggle);
}
