class Banner extends HTMLElement {
  connectedCallback() {
    this.handler = this.querySelector('.handler');
    this.moveHandler = this.querySelector('[data-move]');

    this.handler.addEventListener('click', () => {
      this.classList.toggle('open');
    });

    this.moveHandler.addEventListener('click', () => {
      this.classList.toggle('bottom');
    });
  }
}

if (!customElements.get('chealt-banner')) {
  customElements.define('chealt-banner', Banner);
}
