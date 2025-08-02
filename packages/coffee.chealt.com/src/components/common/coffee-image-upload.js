import { getContentHash, uploadFile } from '../../utils/file.js';
import { setItem } from '../../utils/storage.js';

const addCollectionWithItem = 'chealt-collection-add-with-item';
const addImageToCollection = 'chealt-add-image-to-collection';
const addImageToCollectionItem = 'chealt-add-image-to-collection-item';
class CoffeeImageUpload extends HTMLElement {
  connectedCallback() {
    this.triggerButton = this.querySelector('.triggerButton');
    this.fileInput = this.querySelector('input[type=file]');
    this.getSignedUrl = this.dataset.getSignedUrl;

    this.addClickListener();
    this.addFileChangeListener();
  }

  addFileChangeListener() {
    this.fileInput.addEventListener('change', async () => {
      this.triggerButton.classList.add('in-progress');

      const collectionId = this.dataset.collectionId || crypto.randomUUID();
      const itemId = this.dataset.itemId || crypto.randomUUID();

      try {
        const fileData = this.fileInput.files[0];
        const filename = await getContentHash({ arrayBuffer: await fileData.arrayBuffer() });

        await uploadFile({ filename, fileData, getSignedUrl: this.getSignedUrl });

        if (this.dataset.itemId) {
          await setItem(addImageToCollectionItem, {
            itemId,
            filename
          });
        } else if (this.dataset.collectionId) {
          await setItem(addImageToCollection, {
            id: collectionId,
            itemId,
            filename
          });
        } else {
          const collectionName = this.dataset.unnamedTitle;

          await setItem(addCollectionWithItem, {
            id: collectionId,
            name: collectionName,
            isBuiltIn: false,
            items: [{ id: itemId, images: [{ filename }] }]
          });
        }
      } catch (error) {
        if (error.name === 'AbortError') {
          console.log('user abort'); // eslint-disable-line no-console
        } else {
          console.error(error); // eslint-disable-line no-console
        }
      }

      window.location.assign(`${this.triggerButton.getAttribute('href')}${collectionId}/items/${itemId}`);
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
