import { setItem } from '../../../utils/storage.js';

const addItemToCollection = 'chealt-add-item-to-collection';
const removeItemFromCollection = 'chealt-remove-item-from-collection';
const itemIdPrefix = 'item-id-';
const heldTimeout = 600;

class CoffeeCollection extends HTMLElement {
  connectedCallback() {
    this.batchUpdatePopover = this.querySelector('#batch-update');
    this.clearSelection = this.querySelector('[data-clear-trigger]');
    this.editCollectionsDialog = this.querySelector('#edit-collections');
    this.editCollectionsTrigger = this.querySelector('[data-dialog-id="edit-collections"]');
    this.collectionCheckboxes = this.editCollectionsDialog.querySelectorAll('[type="checkbox"]');

    const links = this.querySelectorAll('a');

    links.forEach((element) => element.addEventListener('click', this.addInProgressClass.bind(this)));
    links.forEach((element) => element.addEventListener('mousedown', this.selectItemWhenHeld.bind(this)));
    links.forEach((element) =>
      element.addEventListener('contextmenu', (event) => {
        event.preventDefault();

        this.selectItemWhenHeld(event).bind(this);
      })
    );

    this.clearSelection.addEventListener('click', () => {
      links.forEach((element) => element.classList.remove('selected'));

      this.batchUpdatePopover.hidePopover();
    });

    this.collectionCheckboxes.forEach((element) => element.addEventListener('click', this.toggleCollection.bind(this)));
    this.editCollectionsTrigger.addEventListener('click', this.updateCollectionCheckboxes.bind(this));

    window.addEventListener('beforeunload', this.clearTimer.bind(this));
  }

  addInProgressClass(event) {
    const hasSelected = Boolean(this.querySelectorAll('.selected').length);

    if (!hasSelected && event.currentTarget.getAttribute('is-held') === 'false') {
      event.currentTarget.classList.add('in-progress');
    } else {
      event.preventDefault();

      const link = event.currentTarget;

      if (link.getAttribute('is-held') === 'false') {
        link.classList.toggle('selected');
      }
    }

    if (!Boolean(this.querySelectorAll('.selected').length)) {
      this.batchUpdatePopover.hidePopover();
    }
  }

  selectItemWhenHeld(event) {
    const hasSelected = Boolean(this.querySelectorAll('.selected').length);
    const link = event.currentTarget;
    const isSelected = link.classList.contains('selected');

    link.setAttribute('is-held', false);

    if (!isSelected && !hasSelected) {
      this.timeout = setTimeout(() => {
        link.setAttribute('is-held', true);
        link.classList.add('selected');
        this.batchUpdatePopover.showPopover();
      }, heldTimeout);
    }
  }

  updateCollectionCheckboxes() {
    const selectedItemIds = Array.from(this.querySelectorAll('.selected') || []).map((element) =>
      element.getAttribute('id')
    );
    const selectedItemWithCollections = selectedItemIds.map((id) => ({
      id,
      inCollections: Array.from(this.querySelectorAll(`#${id}`)).map((selectedElement) =>
        selectedElement.closest('[data-type="collection"').getAttribute('id')
      )
    }));

    this.collectionCheckboxes.forEach((element) => {
      const collectionId = element.value;
      const isChecked = selectedItemWithCollections.every(({ inCollections }) => inCollections.includes(collectionId));
      const isIndeterminate = selectedItemWithCollections.some(({ inCollections }) =>
        inCollections.includes(collectionId)
      );

      element.checked = isChecked;
      element.indeterminate = !isChecked && isIndeterminate;
    });
  }

  async toggleCollection(event) {
    const isAdd = event.currentTarget.checked;
    const collectionId = event.currentTarget.value;
    const selectedItemIds = Array.from(this.querySelectorAll('.selected') || []).map((element) =>
      element.id.replace(itemIdPrefix, '')
    );

    if (isAdd) {
      await Promise.all(
        selectedItemIds.map((itemId) =>
          setItem(addItemToCollection, {
            collectionId,
            itemId
          })
        )
      );
    } else {
      await Promise.all(
        selectedItemIds.map((itemId) =>
          setItem(removeItemFromCollection, {
            collectionId,
            itemId
          })
        )
      );
    }
  }

  clearTimer() {
    if (this.timeout) {
      clearTimeout(this.timeout);
    }
  }

  disconnectedCallback() {
    this.clearTimer();
  }
}

if (!customElements.get('coffee-collection')) {
  customElements.define('coffee-collection', CoffeeCollection);
}
