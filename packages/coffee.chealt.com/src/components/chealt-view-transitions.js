class ChealtViewTransitions extends HTMLElement {
  // eslint-disable-next-line class-methods-use-this
  connectedCallback() {
    /** @type {NodeListOf<HTMLElement>} */
    const elements = document.querySelectorAll('[data-view-transition-name]');

    elements.forEach((element) => {
      element.addEventListener('click', () => {
        elements.forEach((other) => {
          other.style.viewTransitionName = 'none';
        });

        // name the element so it is captured in the outgoing page snapshot
        element.style.viewTransitionName = element.dataset.viewTransitionName;
      });
    });
  }
}

if (!customElements.get('chealt-view-transitions')) {
  customElements.define('chealt-view-transitions', ChealtViewTransitions);
}
