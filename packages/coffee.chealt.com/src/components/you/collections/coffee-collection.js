import {
  getCollection,
  getAllCollections,
  updateCollectionName,
  save,
  deleteCollection
} from '../../common/storage.js';

class CoffeeCollection extends HTMLElement {
  static refreshEventName = 'coffee-collection-refresh';

  connectedCallback() {
    this.collectionElement = this.closest('[data-db-attr-id]');
    this.nameElement = this.collectionElement.querySelector('[data-db-attr-name]');
    this.collectionID = this.collectionElement.dataset.dbAttrId;
    this.isBuiltIn = this.collectionElement.dataset.dbAttrIsBuiltIn === 'true';
    this.shouldSync = this.collectionElement.dataset.shouldSync;

    this.addMissingCollection();
    this.addRefreshListener();

    if (!this.isBuiltIn) {
      this.renderName();
      this.deleteOnClick();
    }

    this.render();
  }

  async addMissingCollection() {
    const { collectionID, isBuiltIn } = this;
    const collection = getCollection(this.collectionID);
    const collectionName = this.nameElement.textContent;

    if (!collection) {
      await save({
        collectionID,
        collectionName,
        isBuiltIn,
        shouldSync: this.shouldSync
      });
    }
  }

  renderName() {
    const collection = getCollection(this.collectionID);
    const name = collection?.name;

    if (name !== this.nameElement.textContent) {
      updateCollectionName({ collectionID: collection.id, collectionName: this.nameElement.textContent });
    }

    this.nameElement.setAttribute('contenteditable', '');

    if (name && name === this.nameElement.textContent) {
      this.nameElement.textContent = name;
    }

    this.nameElement.addEventListener('input', this.updateName.bind(this));
  }

  updateName(event) {
    if (this.callbackID) {
      cancelIdleCallback(this.callbackID);
    }

    const collectionName = event.target.textContent;

    this.callbackID = requestIdleCallback(() => {
      updateCollectionName({ collectionID: this.collectionID, collectionName, shouldSync: this.shouldSync });
    });
  }

  deleteOnClick() {
    const deleteTrigger = this.collectionElement.querySelector('[data-delete-trigger]');
    const confirmText = deleteTrigger.dataset.confirmText;

    deleteTrigger.addEventListener('click', () => {
      // eslint-disable-next-line no-alert
      if (confirm(confirmText)) {
        deleteCollection({ collectionID: this.collectionID, shouldSync: this.shouldSync });

        this.collectionElement.remove();
      }
    });
  }

  // eslint-disable-next-line complexity
  async render() {
    const collections = getAllCollections();
    const collection = getCollection(this.collectionID);
    const rootDirectory = await navigator.storage.getDirectory();

    // remove delete trigger of a built-in collection
    if (this.isBuiltIn && this.collectionElement.querySelector('[data-delete-trigger]')) {
      this.collectionElement.querySelector('[data-delete-trigger]').remove();
    }

    // add items
    const existingItemsElement = this.collectionElement.querySelector('[data-db-type=items]');
    let itemsElement = existingItemsElement;

    if (!itemsElement) {
      itemsElement = document.createElement('ul');
      itemsElement.setAttribute('data-db-type', 'items');
    }

    if (!collection?.items) {
      // item doesn't exist in local storage, but exists on the server
      if (itemsElement) {
        itemsElement.querySelectorAll('[data-item-id]').forEach((item) => {
          item.querySelectorAll('[data-file-name]').forEach((image) => {
            save({
              collectionID: this.collectionID,
              itemID: item.dataset.itemId,
              filename: image.dataset.fileName,
              uploaded: true
            });
          });
        });
      }

      return;
    }

    for await (const { id: itemID, images } of collection.items) {
      const existingItemElement = this.collectionElement.querySelector(`[data-item-id="${itemID}"]`);
      let itemElement = existingItemElement;

      if (!existingItemElement) {
        // add a list item
        itemElement = document.createElement('li');
        itemElement.classList.add('picture-collection');
        itemElement.setAttribute('data-item-id', itemID);
      }

      const isFavorite =
        this.collectionID === 'favorites' ||
        collections
          .find(({ id: existingCollectionID }) => existingCollectionID === 'favorites')
          ?.items?.some(({ id: existingItemID }) => itemID === existingItemID);

      if (isFavorite) {
        itemElement.setAttribute('data-is-favorite', '');
      }

      const existingDetailsElement = itemElement.querySelector('coffee-details');
      let details = existingDetailsElement;

      if (!existingDetailsElement) {
        details = document.createElement('coffee-details');
      }

      // add images
      const existingImagesContainer = itemElement.querySelector('.images-container');
      let imagesContainer = existingImagesContainer;

      if (!existingImagesContainer) {
        imagesContainer = document.createElement('div');
        imagesContainer.classList.add('carousel');
        imagesContainer.classList.add('images-container');
      }

      for (const { filename } of images) {
        const existingImage = imagesContainer.querySelector(`[data-file-name="${filename}"]`);

        if (existingImage) {
          if (!existingImage.id) {
            existingImage.id = filename;
          }

          continue;
        }

        const fileHandle = await rootDirectory.getFileHandle(filename);
        const fileData = await fileHandle.getFile();

        const image = new Image(this.collectionElement.clientWidth);
        image.src = URL.createObjectURL(fileData);
        image.setAttribute('data-file-name', filename);
        image.id = filename;

        imagesContainer.appendChild(image);
      }

      if (!existingImagesContainer) {
        itemElement.appendChild(imagesContainer);
      }

      if (!existingDetailsElement) {
        // add details
        details.appendChild(imagesContainer);
        itemElement.appendChild(details);

        // add controls
        const template = document.getElementById('coffee-controls-template');
        const templateContent = template.content;

        itemElement.appendChild(templateContent.cloneNode(true));
      }

      if (!existingItemElement) {
        itemsElement.appendChild(itemElement);
      }
    }

    if (!existingItemsElement) {
      this.collectionElement.appendChild(itemsElement);
    }
  }

  addRefreshListener() {
    document.addEventListener(CoffeeCollection.refreshEventName, () => {
      this.render();
    });
  }

  disconnectedCallback() {
    if (this.callbackID) {
      cancelIdleCallback(this.callbackID);
    }

    this.nameElement.removeEventListener('input', this.updateName);
  }
}

if (!customElements.get('coffee-collection')) {
  customElements.define('coffee-collection', CoffeeCollection);
}
