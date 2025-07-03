import { getCollectionByName, save } from './storage.js';
import { uploadFile, writeFile } from '../../utils/file.js';

class CoffeeImageUpload extends HTMLElement {
  connectedCallback() {
    this.triggerButton = this.querySelector('.triggerButton');
    this.navigateTo = this.triggerButton.getAttribute('href');
    this.fileInput = this.querySelector('input[type=file]');
    this.shouldSync = this.dataset.shouldSync;
    this.getSignedUrl = this.dataset.getSignedUrl;

    this.addClickListener();
    this.addFileChangeListener();
  }

  addFileChangeListener() {
    // eslint-disable-next-line complexity
    this.fileInput.addEventListener('change', async () => {
      const collectionElement = this.closest('[data-db-attr-id]');
      const isBuiltIn = collectionElement?.getAttribute('data-db-attr-is-built-in') === '' || false;
      const unnamedCollection = getCollectionByName(this.dataset.unnamedTitle);
      const collectionID =
        collectionElement?.getAttribute('data-db-attr-id') || unnamedCollection?.id || crypto.randomUUID();
      const itemID = this.closest('[data-item-id]')?.getAttribute('data-item-id') || crypto.randomUUID();
      const collectionName =
        collectionElement?.querySelector('[data-db-attr-name]')?.textContent ||
        unnamedCollection?.title ||
        this.dataset.unnamedTitle;

      const fileData = this.fileInput.files[0];

      try {
        const filename = await writeFile(fileData);

        let uploaded = false;

        if (this.shouldSync) {
          try {
            uploaded = await uploadFile({ filename, fileData, getSignedUrl: this.getSignedUrl });
          } catch (error) {
            console.error(error); // eslint-disable-line no-console
          }
        }

        await save({
          collectionID,
          collectionName,
          itemID,
          filename,
          isBuiltIn,
          shouldSync: this.shouldSync,
          uploaded
        });
      } catch (error) {
        if (error.name === 'AbortError') {
          console.log('user abort'); // eslint-disable-line no-console
        } else {
          console.error(error); // eslint-disable-line no-console
        }
      }

      if (!collectionElement && !unnamedCollection) {
        this.dispatchEvent(new CustomEvent('coffee-gallery-refresh', { bubbles: true }));
      } else {
        this.dispatchEvent(new CustomEvent('coffee-collection-refresh', { bubbles: true }));
      }

      // navigate to the collections page if it is not the current page
      if (this.navigateTo && window.location.pathname !== this.navigateTo) {
        window.location.assign(this.navigateTo);
      }
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
