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

        // add a delete button
        const deleteButton = document.createElement('button');
        deleteButton.innerText = 'delete';

        deleteButton.addEventListener('click', () => {
          this.pictures.removeChild(picture);
          deleteFile(name);
        });

        picture.appendChild(deleteButton);

        // add a delete button
        const recognizeButton = document.createElement('button');
        recognizeButton.innerText = 'recognize';

        recognizeButton.addEventListener('click', async () => {
          recognizeButton.innerText = 'loading...';
          await this.ocrPromise;
          const texts = await this.extractText(image.src);

          console.log(texts); // eslint-disable-line no-console

          this.querySelector('.text').innerHTML = '';
          this.querySelector('.text').appendChild(document.createElement('ul'));
          texts.forEach((text) => {
            const li = document.createElement('li');
            li.innerText = text;

            this.querySelector('.text ul').appendChild(li);
          });
          recognizeButton.innerText = 'recognize';
        });

        picture.appendChild(recognizeButton);

        const text = document.createElement('div');
        text.classList.add('text');

        picture.appendChild(text);

        this.pictures.appendChild(picture);
      }
    }

    this.triggerOcr();
  }

  addRefreshListener() {
    this.addEventListener(CoffeeGallery.refreshEventName, () => {
      this.render();
    });
  }

  async triggerOcr() {
    for await (const image of this.pictures.querySelectorAll('img')) {
      image.classList.add('processing');

      let imageSrc;

      if (image.complete) {
        imageSrc = image.src;
      } else {
        imageSrc = await new Promise((resolve) => {
          image.addEventListener('load', async () => {
            resolve(image.src);
          });
        });
      }

      // const text = await extractText(imageSrc);

      // console.log(text); // eslint-disable-line no-console

      image.classList.remove('processing');
    }
  }
}

customElements.define('coffee-gallery', CoffeeGallery);
