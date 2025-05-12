import { deleteFile } from '../../utils/file';

class CoffeeGallery extends HTMLElement {
  static refreshEventName = 'coffee-gallery-refresh';

  async connectedCallback() {
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
        image.id = `${fileData.name}_${fileData.lastModified}`;

        // add image container
        const imageContainer = document.createElement('div');
        imageContainer.classList.add('image-container');

        imageContainer.appendChild(image);

        // add a list item
        const picture = document.createElement('li');
        picture.setAttribute('data-name', name);

        // add details
        const details = document.createElement('coffee-details');

        details.setAttribute('data-name', name);
        details.appendChild(imageContainer);

        picture.appendChild(details);

        // add controls
        const controls = document.createElement('div');
        controls.classList.add('controls');

        // add a delete button
        const deleteButton = document.createElement('button');
        deleteButton.innerText = 'delete';

        deleteButton.addEventListener('click', () => {
          this.pictures.removeChild(picture);
          deleteFile(name);
        });

        controls.appendChild(deleteButton);

        picture.appendChild(controls);

        const text = document.createElement('div');
        text.classList.add('text');

        picture.appendChild(text);

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
