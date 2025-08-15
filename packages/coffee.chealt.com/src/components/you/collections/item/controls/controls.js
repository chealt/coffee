import { setItem } from '../../../../../utils/storage.js';

const addItemToCollection = 'chealt-add-item-to-collection';
const removeItemFromCollection = 'chealt-remove-item-from-collection';

class CoffeeControls extends HTMLElement {
  connectedCallback() {
    this.addFavoriteEventListener();
    this.addToCollectionListener();
  }

  addToCollectionListener() {
    this.querySelector('[for="add-to-collection"]').addEventListener('click', (element) => {
      element.currentTarget.closest('dialog').close();
      document.querySelector('#add-to-collection').showModal();
    });

    this.querySelectorAll('#add-to-collection input[type=checkbox]').forEach((checkbox) => {
      checkbox.addEventListener('change', async (element) => {
        const collectionId = element.currentTarget.value;
        const itemId = this.closest('[data-item-id]').dataset.itemId;
        const isChecked = element.currentTarget.checked;

        if (isChecked) {
          await setItem(addItemToCollection, {
            collectionId,
            itemId
          });
        } else {
          await setItem(removeItemFromCollection, {
            collectionId,
            itemId
          });
        }
      });
    });
  }

  addFavoriteEventListener() {
    this.querySelector('.favorite').addEventListener('click', () => {
      const favoriteIcon = this.querySelector('.favorite .icon');

      favoriteIcon.classList.toggle('active');

      const hasBecameFavorite = favoriteIcon.classList.contains('active');

      if (hasBecameFavorite) {
        setItem(addItemToCollection, {
          collectionId: 'favorites',
          itemId: this.dataset.itemId
        });
      } else {
        setItem(removeItemFromCollection, {
          collectionId: 'favorites',
          itemId: this.dataset.itemId
        });

        if (window.location.pathname.includes('favorites')) {
          window.location.assign(this.dataset.collectionsUrl);
        }
      }
    });
  }
}

if (!customElements.get('coffee-controls')) {
  customElements.define('coffee-controls', CoffeeControls);
}
