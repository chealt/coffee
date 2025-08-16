import { setItem } from '../../../../../utils/storage.js';

const addItemToCollection = 'chealt-add-item-to-collection';
const removeItemFromCollection = 'chealt-remove-item-from-collection';

class CoffeeControls extends HTMLElement {
  connectedCallback() {
    this.addFavoriteEventListener();
    this.addEditCollectionsListener();
  }

  addEditCollectionsListener() {
    this.querySelector('[for="edit-collections"]').addEventListener('click', (element) => {
      element.currentTarget.closest('dialog').close();
      document.querySelector('#edit-collections').showModal();
    });

    this.querySelectorAll('#edit-collections input[type=checkbox]').forEach((checkbox) => {
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

        this.toggleDisabledState();
        this.triggerCollectionsChangeEvent();
      });
    });
  }

  toggleDisabledState() {
    const checkedCheckboxes = this.querySelectorAll('#edit-collections input[type=checkbox]:checked');

    if (checkedCheckboxes.length === 1) {
      checkedCheckboxes[0].setAttribute('disabled', true);
    } else {
      this.querySelectorAll('#edit-collections input[type=checkbox]:checked').forEach((checkbox) => {
        checkbox.removeAttribute('disabled');
      });
    }
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

        this.triggerCollectionsChangeEvent();
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

  triggerCollectionsChangeEvent() {
    const event = new CustomEvent('coffee:collections:change', {
      bubbles: true
    });

    this.dispatchEvent(event);
  }
}

if (!customElements.get('coffee-controls')) {
  customElements.define('coffee-controls', CoffeeControls);
}
