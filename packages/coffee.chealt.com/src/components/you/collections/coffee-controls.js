import { deleteFile } from '../../../utils/file';
import { getCollectionItems, deleteCollectionItem } from '../../common/storage.js';

class CoffeeControls extends HTMLElement {
  connectedCallback() {
    this.addDeleteEventListener();
  }

  addDeleteEventListener() {
    this.querySelector('.delete').addEventListener('click', async () => {
      const collectionID = this.closest('[data-collection-id]')?.getAttribute('data-collection-id');
      const itemsElement = this.closest('[data-item-id]');
      const itemID = itemsElement.getAttribute('data-item-id');
      const items = getCollectionItems({ collectionID, itemID });

      if (items.images) {
        await Promise.all(items.images.map(async ({ fileName }) => {
          deleteFile(fileName);
        }));
      }

      deleteCollectionItem({ collectionID, itemID });
      this.closest('[data-type=items]').removeChild(itemsElement);
    });
  }
}

if (!customElements.get('coffee-controls')) {
  customElements.define('coffee-controls', CoffeeControls);
}
