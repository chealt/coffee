import { deleteFile } from '../../utils/file';

class CoffeeGallery extends HTMLElement {
  static refreshEventName = 'coffee-gallery-refresh';

  async connectedCallback() {
    this.pictures = this.querySelector('#pictures');

    this.initOcr();
    this.render();
    this.addRefreshListener();
  }

  async initOcr() {
    this.classList.add('loading-ocr');

    this.ocrPromise = new Promise(async (resolve) => {
      const ocr = await (await import('@chealt/ocr')).default();

      this.extractText = ocr.extractText;
      resolve();
    });

    await this.ocrPromise;

    this.classList.remove('loading-ocr');
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

        // add controls
        const controls = document.createElement('div');
        controls.classList.add('controls');

        // add a recognize button
        const recognizeButton = document.createElement('button');
        recognizeButton.innerText = 'recognize';

        recognizeButton.addEventListener('click', async () => {
          recognizeButton.innerText = 'loading...';
          await this.ocrPromise;
          const texts = await this.extractText(image.src);

          console.log(texts); // eslint-disable-line no-console

          picture.querySelector('.text').innerHTML = '';
          picture.querySelector('.text').appendChild(document.createElement('ul'));
          texts.forEach((text) => {
            const li = document.createElement('li');
            li.innerText = text;

            picture.querySelector('.text ul').appendChild(li);
          });
          recognizeButton.innerText = 'recognize';
        });

        controls.appendChild(recognizeButton);

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
