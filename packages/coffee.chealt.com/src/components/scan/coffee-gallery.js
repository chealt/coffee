import { deleteFile } from '../../utils/file';

class CoffeeGallery extends HTMLElement {
  static refreshEventName = 'coffee-gallery-refresh';

  connectedCallback() {
    this.pictures = this.querySelector('#pictures');

    this.render();
    this.addRefreshListener();
  }

  async render() {
    const rootDirectory = await navigator.storage.getDirectory();

    for await (const name of rootDirectory.keys()) {
      if (!this.pictures.querySelector(`[data-name="${name}"]`)) {
        const fileHandle = await rootDirectory.getFileHandle(name);
        const fileData = await fileHandle.getFile();

        const image = new Image(this.pictures.clientWidth);
        image.src = URL.createObjectURL(fileData);

        // add a list item
        const picture = document.createElement('li');
        picture.setAttribute('data-name', name);

        picture.appendChild(image);

        // add a delete button
        const deleteButton = document.createElement('button');
        deleteButton.innerText = 'delete';

        deleteButton.addEventListener('click', () => {
          this.pictures.removeChild(picture);
          deleteFile(name);
        });

        picture.appendChild(deleteButton);

        this.pictures.appendChild(picture);
      }
    }
  }

  addRefreshListener() {
    this.addEventListener(CoffeeGallery.refreshEventName, () => {
      this.render();
    });
  }
}

customElements.define('coffee-gallery', CoffeeGallery);
