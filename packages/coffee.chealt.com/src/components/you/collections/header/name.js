import { setItem } from '../../../../utils/storage.js';

const collectionNameKey = 'chealt-collection-name';

class CoffeeCollectionName extends HTMLElement {
  connectedCallback() {
    this.querySelector('[data-attr-name]').addEventListener('input', this.updateName.bind(this));
  }

  updateName(event) {
    if (this.callbackID) {
      cancelIdleCallback(this.callbackID);
    }

    const name = event.target.textContent;

    this.callbackID = requestIdleCallback(() => {
      setItem(collectionNameKey, { id: this.dataset.collectionId, name });
    });
  }
}

if (!customElements.get('coffee-collection-name')) {
  customElements.define('coffee-collection-name', CoffeeCollectionName);
}
