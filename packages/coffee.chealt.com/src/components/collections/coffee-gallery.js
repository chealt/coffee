import { getAllCollections } from './storage';

class CoffeeGallery extends HTMLElement {
  static refreshEventName = 'coffee-gallery-refresh';

  async connectedCallback() {
    this.pictures = this.querySelector('#pictures');

    this.render();
    this.addRefreshListener();
  }

  async render() {
    const rootDirectory = await navigator.storage.getDirectory();
    const collections = getAllCollections();

    Object.entries(collections).forEach(async ([id, collection]) => {
      // skip collection that already exists and has all the images
      const existingCollection = this.pictures.querySelector(`[data-collection-id="${id}"]`);

      if (existingCollection && !collection.some(({ name }) => !this.pictures.querySelector(`[data-name="${name}"]`))) {
        return;
      }

      if (existingCollection) {
        const images = existingCollection.querySelector('.images-container');
        const missingImages = collection.filter(({ name }) => !this.pictures.querySelector(`[data-name="${name}"]`));

        await Promise.all(missingImages.map(async ({ name }) => {
          const fileHandle = await rootDirectory.getFileHandle(name);
          const fileData = await fileHandle.getFile();

          const image = new Image(this.pictures.clientWidth);
          image.src = URL.createObjectURL(fileData);
          image.setAttribute('data-name', name);
          image.id = `${fileData.name}_${fileData.lastModified}`;

          images.appendChild(image);
        }));
      } else {
        // add a list item
        const pictureCollection = document.createElement('li');
        pictureCollection.setAttribute('data-collection-id', id);
        pictureCollection.classList.add('picture-collection');

        const details = document.createElement('coffee-details');
        details.setAttribute('data-collection-id', id);

        // add images
        const imagesContainer = document.createElement('div');
        imagesContainer.classList.add('images-container');

        await Promise.all(collection.map(async ({ name }) => {
          const fileHandle = await rootDirectory.getFileHandle(name);
          const fileData = await fileHandle.getFile();

          const image = new Image(this.pictures.clientWidth);
          image.src = URL.createObjectURL(fileData);
          image.setAttribute('data-name', name);
          image.id = `${fileData.name}_${fileData.lastModified}`;

          imagesContainer.appendChild(image);
        }));

        details.appendChild(imagesContainer);
        pictureCollection.appendChild(details);

        // add controls
        const template = document.getElementById('coffee-controls-template');
        const templateContent = template.content;

        pictureCollection.appendChild(templateContent.cloneNode(true));

        this.pictures.appendChild(pictureCollection);
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
