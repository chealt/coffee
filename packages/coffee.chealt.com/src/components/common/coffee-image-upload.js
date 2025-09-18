import { getContentHash } from '../../utils/file.js';
import { setItem } from '../../utils/storage.js';

const addCollection = 'chealt-add-collection';
const addImageToCollection = 'chealt-add-image-to-collection';
const addImageToCollectionItem = 'chealt-add-image-to-collection-item';

class CoffeeImageUpload extends HTMLElement {
  connectedCallback() {
    this.triggerButton = this.querySelector('.triggerButton');
    this.fileInput = this.querySelector('input[type=file]');
    this.getSignedUrl = this.dataset.getSignedUrl;
    this.imageUploadUrls = this.dataset.imageUploadUrls.split(';');

    this.addClickListener();
    this.addFileChangeListener();
  }

  addFileChangeListener() {
    this.fileInput.addEventListener('change', async () => {
      this.triggerButton.classList.add('in-progress');

      const collectionId = this.dataset.collectionId || crypto.randomUUID();
      let itemId = this.dataset.itemId;

      // create collection if it doesn't exist
      if (!this.dataset.collectionId && !this.dataset.itemId) {
        await setItem(addCollection, {
          id: collectionId,
          name: this.dataset.unnamedTitle,
          isBuiltIn: false
        });
      }

      await Promise.all(
        Array.from(this.fileInput.files).map(async (fileData) => {
          const arrayBuffer = await fileData.arrayBuffer();
          const filename = await getContentHash({ arrayBuffer });

          // upload and cache the image in a service worker
          navigator.serviceWorker.controller.postMessage(
            {
              action: 'cache-image',
              filename,
              fileData,
              getSignedUrl: this.getSignedUrl,
              imageUploadUrls: this.imageUploadUrls,
              buffer: arrayBuffer
            },
            [arrayBuffer]
          );

          if (this.dataset.itemId) {
            await setItem(addImageToCollectionItem, {
              itemId: this.dataset.itemId,
              filename
            });
          } else {
            itemId = crypto.randomUUID();

            await setItem(addImageToCollection, {
              id: collectionId,
              itemId,
              filename
            });
          }
        })
      )
        .then(() => {
          window.location.assign(`${this.triggerButton.getAttribute('href')}${collectionId}/items/${itemId}`);
        })
        .catch((error) => {
          if (error.name === 'AbortError') {
            console.log('user abort'); // eslint-disable-line no-console
          } else {
            console.error(error); // eslint-disable-line no-console
          }
        });
    });
  }

  addClickListener() {
    this.triggerButton.addEventListener('click', async (event) => {
      this.fileInput.click();

      event.preventDefault();
    });
  }
}

if (!customElements.get('coffee-image-upload')) {
  customElements.define('coffee-image-upload', CoffeeImageUpload);
}
