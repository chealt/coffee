import { deleteCollection, getCollection } from './storage.js';
import { deleteFile } from '../../utils/file';

class CoffeeControls extends HTMLElement {
  connectedCallback() {
    this.addDeleteEventListener();
  }

  addDeleteEventListener() {
    this.querySelector('.delete').addEventListener('click', async () => {
      const pictureCollectionElement = this.closest('.picture-collection[data-collection-id]');
      const collectionID = pictureCollectionElement.getAttribute('data-collection-id');
      const collection = getCollection(collectionID);

      if (collection) {
        await Promise.all(collection.map(async ({ name }) => {
          deleteFile(name);
        }));
      }

      deleteCollection(collectionID);
      this.closest('#pictures').removeChild(pictureCollectionElement);
    });
  }
}

if (!customElements.get('coffee-controls')) {
  customElements.define('coffee-controls', CoffeeControls);
}
