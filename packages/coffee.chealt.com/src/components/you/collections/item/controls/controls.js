import { setItem } from '../../../../../utils/storage.js';

const addItemToCollection = 'chealt-add-item-to-collection';
const removeItemFromCollection = 'chealt-remove-item-from-collection';

class CoffeeControls extends HTMLElement {
  connectedCallback() {
    this.addFavoriteEventListener();
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
      }
    });
  }
}

if (!customElements.get('coffee-controls')) {
  customElements.define('coffee-controls', CoffeeControls);
}
