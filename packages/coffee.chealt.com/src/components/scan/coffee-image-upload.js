import { onlyImagePickerOptions, openFile, writeFile } from '../../utils/file';

class CoffeeImageUpload extends HTMLElement {
  connectedCallback() {
    this.addClickListener();
  }

  addClickListener() {
    this.querySelector('button').addEventListener('click', async () => {
      const fileData = await openFile({
        ...onlyImagePickerOptions,
        excludeAcceptAllOption: true,
        multiple: false
      });

      await writeFile(fileData);

      this.dispatchEvent(new CustomEvent('coffee-gallery-refresh', { bubbles: true }));
    });
  }
}

customElements.define('coffee-image-upload', CoffeeImageUpload);
