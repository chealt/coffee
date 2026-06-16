class ChealtViewTransitions extends HTMLElement {
  // eslint-disable-next-line class-methods-use-this
  connectedCallback() {
    /** @type {NodeListOf<HTMLElement>} */
    const elements = document.querySelectorAll('[data-view-transition-name]');

    elements.forEach((element) => {
      element.addEventListener('click', () => {
        const viewTransitionName = element.getAttribute('data-view-transition-name');

        element.style.viewTransitionName = viewTransitionName;
        sessionStorage.setItem('viewTransitionName', viewTransitionName);
      });
    });
  }
}

if (!customElements.get('chealt-view-transitions')) {
  customElements.define('chealt-view-transitions', ChealtViewTransitions);
}
