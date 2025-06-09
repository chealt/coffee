import { getCollection, getAllCollections, updateCollectionName } from '../../common/storage.js';

class CoffeeCollection extends HTMLElement {
  static refreshEventName = 'coffee-collection-refresh';

  connectedCallback() {
    this.collectionElement = this.closest('[data-collection-id]');
    this.nameElement = this.collectionElement.querySelector('[data-name]');
    this.collectionID = this.collectionElement.dataset.collectionId;
    this.isBuiltIn = this.collectionElement.dataset.isBuiltIn === 'true';

    this.addRefreshListener();

    if (!this.isBuiltIn) {
      this.renderName();
    }

    this.render();
  }

  renderName() {
    const collection = getCollection(this.collectionID);
    const name = collection?.name;

    this.nameElement.setAttribute('contenteditable', '');

    if (name) {
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
      updateCollectionName({ collectionID: this.collectionID, collectionName });
    });
  }

  // eslint-disable-next-line complexity
  async render() {
    const collections = getAllCollections();
    const collection = getCollection(this.collectionID);
    const rootDirectory = await navigator.storage.getDirectory();

    const itemsToRemove = collection?.items
      ? this.collectionElement.querySelectorAll(`[data-item-id]:not(${collection.items.map(({ id: itemID }) => `[data-item-id="${itemID}"]`).join(',')})`)
      : this.collectionElement.querySelectorAll('[data-item-id]');

    itemsToRemove?.forEach((item) => {
      item.remove();
    });

    // add items
    const existingItemsElement = this.collectionElement.querySelector('[data-type=items]');
    let itemsElement = existingItemsElement;

    if (!itemsElement) {
      itemsElement = document.createElement('ul');
      itemsElement.setAttribute('data-type', 'items');
    }

    if (!collection?.items) {
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
        collections.find(({ id: existingCollectionID }) => existingCollectionID === 'favorites')?.items?.some(({ id: existingItemID }) => itemID === existingItemID);

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

      for (const { fileName } of images) {
        if (imagesContainer.querySelector(`[data-file-name="${fileName}"]`)) {
          continue;
        }

        const fileHandle = await rootDirectory.getFileHandle(fileName);
        const fileData = await fileHandle.getFile();

        const image = new Image(this.collectionElement.clientWidth);
        image.src = URL.createObjectURL(fileData);
        image.setAttribute('data-file-name', fileName);
        image.id = `${fileData.name}_${fileData.lastModified}`;

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
