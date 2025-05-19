import { onlyImagePickerOptions, openFile, writeFile } from '../../utils/file';

class CoffeeImageUpload extends HTMLElement {
  connectedCallback() {
    this.addClickListener();
  }

  addClickListener() {
    this.querySelector('button').addEventListener('click', async () => {
      try {
        const fileData = await openFile({
          ...onlyImagePickerOptions,
          excludeAcceptAllOption: true,
          multiple: false
        });

        await writeFile(fileData);
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
}

customElements.define('coffee-image-upload', CoffeeImageUpload);
