import { getAllCollections } from '../../common/storage.js';

class CoffeeGallery extends HTMLElement {
  static refreshEventName = 'coffee-gallery-refresh';

  async connectedCallback() {
    this.collections = this.querySelector('[data-type=collections]');

    this.render();
    this.addRefreshListener();
  }

  async render() {
    const rootDirectory = await navigator.storage.getDirectory();
    const collections = getAllCollections();

    collections.forEach(async ({ id, items }) => {
      const existingCollection = this.collections.querySelector(`[data-collection-id="${id}"]`);

      if (
        existingCollection &&
        !items?.some(({ id: itemID, images }) =>
          images.some(({ fileName }) => !existingCollection.querySelector(`[data-item-id="${itemID}"]`)?.querySelector(`[data-file-name="${fileName}"]`))
        )
      ) {
        return;
      }

      if (existingCollection) {
        items.forEach(async ({ id: itemID, images }) => {
          const itemElement = existingCollection.querySelector(`[data-item-id="${itemID}"]`);

          if (itemElement) {
            const imagesContainer = itemElement.querySelector('.images-container');
            const missingImages = images.filter(({ fileName }) => !itemElement.querySelector(`[data-file-name="${fileName}"]`));

            await Promise.all(missingImages.map(async ({ fileName }) => {
              const fileHandle = await rootDirectory.getFileHandle(fileName);
              const fileData = await fileHandle.getFile();

              const image = new Image(this.collections.clientWidth);
              image.src = URL.createObjectURL(fileData);
              image.setAttribute('data-file-name', fileName);
              image.id = `${fileData.name}_${fileData.lastModified}`;

              imagesContainer.appendChild(image);
            }));
          } else {
            // add items
            const itemsElement = document.createElement('ul');
            itemsElement.setAttribute('data-type', 'items');

            const newItem = document.createElement('li');
            newItem.setAttribute('data-item-id', itemID);
            newItem.classList.add('picture-collection');

            const details = document.createElement('coffee-details');

            // add images
            const imagesContainer = document.createElement('div');
            imagesContainer.classList.add('carousel');
            imagesContainer.classList.add('images-container');

            await Promise.all(images.map(async ({ fileName }) => {
              const fileHandle = await rootDirectory.getFileHandle(fileName);
              const fileData = await fileHandle.getFile();

              const image = new Image(this.collections.clientWidth);
              image.src = URL.createObjectURL(fileData);
              image.setAttribute('data-file-name', fileName);
              image.id = `${fileData.name}_${fileData.lastModified}`;

              imagesContainer.appendChild(image);
            }));

            details.appendChild(imagesContainer);
            newItem.appendChild(details);

            // add controls
            const template = document.getElementById('coffee-controls-template');
            const templateContent = template.content;

            newItem.appendChild(templateContent.cloneNode(true));

            itemsElement.appendChild(newItem);

            existingCollection.appendChild(itemsElement);
          }
        });
      } else {
        const collectionElement = document.createElement('li');
        collectionElement.setAttribute('data-collection-id', id);

        // add items
        const itemsElement = document.createElement('ul');
        itemsElement.setAttribute('data-type', 'items');

        items?.forEach(async ({ id: itemID, images }) => {
          // add a list item
          const itemElement = document.createElement('li');
          itemElement.setAttribute('data-item-id', itemID);
          itemElement.classList.add('picture-collection');

          const details = document.createElement('coffee-details');

          // add images
          const imagesContainer = document.createElement('div');
          imagesContainer.classList.add('carousel');
          imagesContainer.classList.add('images-container');

          await Promise.all(images.map(async ({ fileName }) => {
            const fileHandle = await rootDirectory.getFileHandle(fileName);
            const fileData = await fileHandle.getFile();

            const image = new Image(this.collections.clientWidth);
            image.src = URL.createObjectURL(fileData);
            image.setAttribute('data-file-name', fileName);
            image.id = `${fileData.name}_${fileData.lastModified}`;

            imagesContainer.appendChild(image);
          }));

          details.appendChild(imagesContainer);
          itemElement.appendChild(details);

          // add controls
          const template = document.getElementById('coffee-controls-template');
          const templateContent = template.content;

          itemElement.appendChild(templateContent.cloneNode(true));

          itemsElement.appendChild(itemElement);
        });

        collectionElement.appendChild(itemsElement);
        this.collections.appendChild(collectionElement);
      }
    });
  }

  addRefreshListener() {
    document.addEventListener(CoffeeGallery.refreshEventName, () => {
      this.render();
    });
  }
}

customElements.define('coffee-gallery', CoffeeGallery);
