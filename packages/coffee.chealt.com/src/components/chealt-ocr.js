const storageKey = 'ocr-texts';

class ChealtOcr extends HTMLElement {
  connectedCallback() {
    this.initOcr();
    this.extractAllTexts();
    this.addMutationObserver();
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

  addMutationObserver() {
    this.observer = new MutationObserver(this.extractAllTexts.bind(this));

    this.observer.observe(this, { childList: true, subtree: true });
  }

  async extractAllTexts() {
    if (this.isExtracting) {
      return;
    }

    this.isExtracting = true;

    try {
      await this.ocrPromise;

      const images = this.querySelectorAll('img');

      for await (const image of images) {
        const imageSrc = image.src;
        const id = image.id;

        if (ChealtOcr.getSavedTexts(id)) {
          continue;
        }

        const texts = await this.triggerTextExtraction(imageSrc);

        ChealtOcr.saveOCR({ id, texts });
      }
    } catch (error) {
      console.error(error);
    }

    this.isExtracting = false;
  }

  async triggerTextExtraction(imageSrc) {
    const texts = await this.extractText(imageSrc);

    return texts;
  }

  static getSavedTexts(id) {
    return (JSON.parse(localStorage.getItem(storageKey)) || {})[id];
  }

  static saveOCR({ id, texts }) {
    const savedTexts = JSON.parse(localStorage.getItem(storageKey)) || {};

    localStorage.setItem(storageKey, JSON.stringify({
      ...savedTexts,
      [id]: texts
    }));
  }

  disconnectedCallback() {
    this.observer.disconnect();
  }
}

customElements.define('chealt-ocr', ChealtOcr);
