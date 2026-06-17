import { getContentHash } from '../../utils/file.js';
import { setItem } from '../../utils/storage.js';
import logger from '../errors/utils.js';

const addCollection = 'chealt-add-collection';

class CoffeeImageUpload extends HTMLElement {
  connectedCallback() {
    this.triggerButton = this.querySelector('.triggerButton');
    /** @type {HTMLInputElement} */
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
      let filename;

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
          filename = await getContentHash({ arrayBuffer });
          itemId = itemId || crypto.randomUUID();

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

          // save item to DB in the background
          navigator.serviceWorker.controller.postMessage({
            action: 'cache-collection-item',
            collectionId: this.dataset.itemId ? undefined : collectionId,
            itemId,
            filename
          });
        })
      )
        .then(() => {
          window.location.assign(
            `${this.triggerButton.getAttribute('href')}${collectionId}/items/${itemId}?uploading=true&filename=${filename}`
          );
        })
        .catch((error) => {
          if (error.name === 'AbortError') {
            logger.info('user abort');
          } else {
            logger.error(error);
          }
        });
    });
  }

  addClickListener() {
    this.triggerButton.addEventListener('click', (event) => {
      this.fileInput.click();

      event.preventDefault();
    });
  }
}

if (!customElements.get('coffee-image-upload')) {
  customElements.define('coffee-image-upload', CoffeeImageUpload);
}
