import { setItem } from '../../../utils/storage.js';

class CoffeeCollectionControls extends HTMLElement {
  connectedCallback() {
    this.triggerButton = this.querySelector('.triggerButton');

    this.addNewCollection();
  }

  addNewCollection() {
    this.triggerButton.addEventListener('click', async (event) => {
      event.preventDefault();

      this.triggerButton.classList.add('in-progress');

      const id = crypto.randomUUID();
      const name = event.target.dataset.name;

      await setItem('chealt-add-collection', {
        id,
        name
      });

      window.location.assign(event.target.getAttribute('href'));
    });
  }
}

if (!customElements.get('coffee-collection-controls')) {
  customElements.define('coffee-collection-controls', CoffeeCollectionControls);
}
