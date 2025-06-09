import { save } from './storage';
import { writeFile } from '../../utils/file';

class CoffeeImageUpload extends HTMLElement {
  connectedCallback() {
    this.triggerButton = this.querySelector('.triggerButton');
    this.navigateTo = this.triggerButton.getAttribute('href');
    this.fileInput = this.querySelector('input[type=file]');

    this.addClickListener();
    this.addFileChangeListener();
  }

  addFileChangeListener() {
    // eslint-disable-next-line complexity
    this.fileInput.addEventListener('change', async () => {
      const collectionElement = this.closest('[data-collection-id]');
      const isBuiltIn = collectionElement?.getAttribute('data-is-built-in') === '' || false;
      const collectionID = collectionElement?.getAttribute('data-collection-id') || crypto.randomUUID();
      const itemID = this.closest('[data-item-id]')?.getAttribute('data-item-id') || crypto.randomUUID();
      const collectionName = collectionElement?.querySelector('[data-name]')?.textContent;

      const fileData = this.fileInput.files[0];

      try {
        const fileName = await writeFile(fileData);

        await save({ collectionID, collectionName, itemID, fileName, isBuiltIn });
      } catch (error) {
        if (error.name === 'AbortError') {
          console.log('user abort'); // eslint-disable-line no-console
        } else {
          console.error(error); // eslint-disable-line no-console
        }
      }

      this.dispatchEvent(new CustomEvent('coffee-gallery-refresh', { bubbles: true }));

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
