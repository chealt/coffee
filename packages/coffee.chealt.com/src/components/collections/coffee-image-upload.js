import { writeFile } from '../../utils/file';

class CoffeeImageUpload extends HTMLElement {
  connectedCallback() {
    this.triggerButton = this.querySelector('button');
    this.fileInput = this.querySelector('input[type=file]');

    this.addClickListener();
    this.addFileChangeListener();
  }

  addFileChangeListener() {
    this.fileInput.addEventListener('change', async () => {
      const fileData = this.fileInput.files[0];

      try {
        await writeFile(fileData);

        // clear the input to fix issue on iOS
        this.fileInput.value = null;
      } catch (error) {
        if (error.name === 'AbortError') {
          console.log('user abort'); // eslint-disable-line no-console
        } else {
          console.error(error); // eslint-disable-line no-console
        }
      }

      this.dispatchEvent(new CustomEvent('coffee-gallery-refresh', { bubbles: true }));
    });
  }

  addClickListener() {
    this.triggerButton.addEventListener('click', async () => {
      this.fileInput.click();
    });
  }
}

customElements.define('coffee-image-upload', CoffeeImageUpload);
