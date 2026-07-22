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
          itemId = this.dataset.itemId || crypto.randomUUID();

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
          if (!this.dataset.itemId) {
            window.location.assign(
              `${this.triggerButton.getAttribute('href')}${collectionId}/items/${itemId}?uploading=true&filename=${filename}`
            );
          } else {
            window.location.assign(`${this.triggerButton.getAttribute('href')}${collectionId}/items/${itemId}`);
          }
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

const retryCachedImageUpload = ({ filename }) => {
  const uploadElement = document.querySelector('coffee-image-upload');

  if (!uploadElement) {
    logger.error('Cannot retry cached image upload, there is no coffee-image-upload element on the page');

    return;
  }

  if (!navigator.serviceWorker.controller) {
    return;
  }

  const { getSignedUrl, imageUploadUrls } = uploadElement.dataset;

  if (!getSignedUrl || !imageUploadUrls) {
    logger.error(
      `Cannot retry cached image upload, missing upload element data: getSignedUrl "${getSignedUrl}", imageUploadUrls "${imageUploadUrls}"`
    );

    return;
  }

  logger.info(`Retrying upload for cached image "${filename}"`);

  navigator.serviceWorker.controller.postMessage({
    action: 'retry-cached-image-upload',
    filename,
    getSignedUrl,
    imageUploadUrls: imageUploadUrls.split(';')
  });
};

if (!customElements.get('coffee-image-upload')) {
  customElements.define('coffee-image-upload', CoffeeImageUpload);

  // the service worker asks the page to resend the upload details
  // when a cached image turns out to be missing upstream
  navigator.serviceWorker?.addEventListener('message', (event) => {
    if (event.data?.action === 'cached-image-upload-missing') {
      retryCachedImageUpload(event.data);
    }
  });
}
