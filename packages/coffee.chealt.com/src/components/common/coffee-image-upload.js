import { writeFile } from '../../utils/file';
import { save } from '../collections/storage';

class CoffeeImageUpload extends HTMLElement {
  connectedCallback() {
    this.triggerButton = this.querySelector('.triggerButton');
    this.navigateTo = this.triggerButton.getAttribute('href');
    this.fileInput = this.querySelector('input[type=file]');

    this.addClickListener();
    this.addFileChangeListener();
  }

  addFileChangeListener() {
    this.fileInput.addEventListener('change', async () => {
      const collectionID = this.closest('[data-collection-id]')?.getAttribute('data-collection-id') || crypto.randomUUID();
      const fileData = this.fileInput.files[0];

      try {
        const fileName = await writeFile(fileData);

        await save({ collectionID, name: fileName });
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
