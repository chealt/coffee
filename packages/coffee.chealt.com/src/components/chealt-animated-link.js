class ChealtAnimatedLink extends HTMLElement {
  connectedCallback() {
    this.querySelector('a').addEventListener('click', (event) => {
      event.currentTarget.classList.add('in-progress');
    });
  }
}

if (!customElements.get('chealt-animated-link')) {
  customElements.define('chealt-animated-link', ChealtAnimatedLink);
}
