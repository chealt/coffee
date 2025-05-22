import { writeFile } from '../../utils/file';

class CoffeeImageUpload extends HTMLElement {
  connectedCallback() {
    this.triggerButton = this.querySelector('a');
    this.fileInput = this.querySelector('input[type=file]');

    this.addClickListener();
    this.addFileChangeListener();
  }

  addFileChangeListener() {
    this.fileInput.addEventListener('change', async () => {
      const fileData = this.fileInput.files[0];

      try {
        await writeFile(fileData);
      } catch (error) {
        if (error.name === 'AbortError') {
          console.log('user abort'); // eslint-disable-line no-console
        } else {
          console.error(error); // eslint-disable-line no-console
        }
      }

      this.dispatchEvent(new CustomEvent('coffee-gallery-refresh', { bubbles: true }));

      // navigate to the collections page if it is not the current page
      if (window.location.pathname !== this.triggerButton.getAttribute('href')) {
        window.location.assign(this.triggerButton.getAttribute('href'));
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

customElements.define('coffee-image-upload', CoffeeImageUpload);
