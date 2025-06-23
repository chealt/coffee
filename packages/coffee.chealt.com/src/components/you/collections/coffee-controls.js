import { deleteFile } from '../../../utils/file';
import { getCollectionItems, deleteCollectionItem, save } from '../../common/storage.js';

class CoffeeControls extends HTMLElement {
  connectedCallback() {
    this.observeFavoriteStatus();
    this.setFavoriteStatus();
    this.addDeleteEventListener();
    this.addFavoriteEventListener();
    this.addReviewEventListener();
  }

  observeFavoriteStatus() {
    const observer = new MutationObserver(() => {
      this.setFavoriteStatus();
    });

    observer.observe(this.closest('[data-item-id]'), { attributes: true });
  }

  setFavoriteStatus() {
    let isFavorite = false;
    const collectionElement = this.closest('[data-db-id]');

    if (!collectionElement) {
      return;
    }

    const collectionID = collectionElement.getAttribute('data-db-id');

    if (collectionID === 'favorites') {
      isFavorite = true;
    } else {
      const itemsElement = this.closest('[data-item-id]');
      const itemID = itemsElement.getAttribute('data-item-id');

      isFavorite = Boolean(getCollectionItems({ collectionID: 'favorites', itemID }));
    }

    const favoriteIcon = this.querySelector('.favorite .icon');

    if (isFavorite) {
      favoriteIcon.classList.add('active');
    } else {
      favoriteIcon.classList.remove('active');
    }
  }

  addDeleteEventListener() {
    this.querySelector('.delete').addEventListener('click', async () => {
      const collectionID = this.closest('[data-db-id]')?.getAttribute('data-db-id');
      const itemsElement = this.closest('[data-item-id]');
      const itemID = itemsElement.getAttribute('data-item-id');
      const items = getCollectionItems({ collectionID, itemID });

      if (items.images) {
        await Promise.all(
          items.images.map(async ({ fileName }) => {
            deleteFile(fileName);
          })
        );
      }

      deleteCollectionItem({ itemID });

      // delete all occurrences of the item, e.g. if it is deleted in a built in collection like favorites
      document.querySelectorAll(`[data-item-id="${itemID}"]`).forEach((element) => {
        element.remove();
      });
    });
  }

  addFavoriteEventListener() {
    this.querySelector('.favorite').addEventListener('click', () => {
      const collectionElement = this.closest('[data-db-id]');
      const collectionID = collectionElement.getAttribute('data-db-id');
      const itemElement = this.closest('[data-item-id]');
      const itemID = itemElement.getAttribute('data-item-id');
      const isFavorite = itemElement.getAttribute('data-is-favorite') !== null;

      if (collectionID === 'favorites') {
        deleteCollectionItem({ collectionID, itemID });
        this.closest('[data-db-type=items]').removeChild(itemElement);

        document.querySelectorAll(`[data-item-id="${itemID}"]`).forEach((element) => {
          element.removeAttribute('data-is-favorite');
        });
      } else {
        if (!isFavorite) {
          const item = getCollectionItems({
            collectionID,
            itemID
          });

          item.images.forEach(async ({ fileName }) => {
            await save({ collectionID: 'favorites', isBuiltIn: true, itemID, fileName });
          });

          itemElement.setAttribute('data-is-favorite', '');
        } else {
          deleteCollectionItem({ collectionID: 'favorites', itemID });
          itemElement.removeAttribute('data-is-favorite');
        }
      }

      this.dispatchEvent(new CustomEvent('coffee-collection-refresh', { bubbles: true }));
    });
  }

  addReviewEventListener() {
    this.querySelector('.review').addEventListener('click', () => {
      const itemID = this.closest('[data-item-id]').dataset.itemId;

      document
        .querySelector('dialog[id=review]')
        .closest('coffee-review')
        .setAttribute('data-name', `${itemID}.review`);
    });
  }
}

if (!customElements.get('coffee-controls')) {
  customElements.define('coffee-controls', CoffeeControls);
}
