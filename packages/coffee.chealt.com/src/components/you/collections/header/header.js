import { setItems } from '../../../../utils/storage.js';

const updateRanksKey = 'chealt-collection-update-ranks';

class CoffeeCollectionHeader extends HTMLElement {
  connectedCallback() {
    this.renameTrigger = this.querySelector('[data-rename-trigger]');
    this.moveUpTrigger = this.querySelector('[data-move-up-trigger]');
    this.moveDownTrigger = this.querySelector('[data-move-down-trigger]');

    this.renameTrigger.addEventListener('click', this.rename.bind(this));
    this.moveUpTrigger?.addEventListener('click', this.moveCollection.bind(this, 'up'));
    this.moveDownTrigger?.addEventListener('click', this.moveCollection.bind(this, 'down'));
  }

  rename() {
    const dialog = this.renameTrigger.closest('dialog');

    if (dialog) {
      dialog.close();
    }

    this.querySelector('[data-attr-name]').focus();
  }

  getCollectionsWithRanks() {
    return Array.from(this.closest('coffee-collection').querySelectorAll('[data-type="collection"]')).map(
      (collection, index) => ({ id: collection.id, rank: index + 1 })
    );
  }

  getNewCollectionsWithRanks({ collectionId, direction }) {
    const collectionToMove = this.getCollectionsWithRanks().find((collection) => collection.id === collectionId);

    return this.getCollectionsWithRanks().map((collection) => {
      if (direction === 'up') {
        if (collection.rank === collectionToMove.rank - 1) {
          return { ...collection, rank: collection.rank + 1 };
        }

        if (collection.rank === collectionToMove.rank) {
          return { ...collection, rank: collection.rank - 1 };
        }
      } else if (direction === 'down') {
        if (collection.rank === collectionToMove.rank) {
          return { ...collection, rank: collection.rank + 1 };
        }

        if (collection.rank === collectionToMove.rank + 1) {
          return { ...collection, rank: collection.rank - 1 };
        }
      }

      return collection;
    });
  }

  async moveCollection(direction) {
    this.moveUpTrigger.disabled = true;
    this.moveDownTrigger.disabled = true;

    if (direction === 'up') {
      this.moveUpTrigger.classList.add('in-progress');
    } else {
      this.moveDownTrigger.classList.add('in-progress');
    }

    const id = this.closest('[data-collection-id]').dataset.collectionId;
    const collectionIds = this.getNewCollectionsWithRanks({ collectionId: id, direction });

    await setItems(updateRanksKey, collectionIds);

    window.location.reload();
  }
}

if (!customElements.get('coffee-collection-header')) {
  customElements.define('coffee-collection-header', CoffeeCollectionHeader);
}
