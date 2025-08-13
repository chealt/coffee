const storageKey = 'ocr-texts';
const ocrInProgressClass = 'ocr-in-progress';

class ChealtOcr extends HTMLElement {
  connectedCallback() {
    const missingOcrTexts = Array.from(this.querySelectorAll('img')).some((element) => !element.dataset.ocr);

    if (missingOcrTexts) {
      this.initOcr();
      this.extractAllTexts();
      this.addMutationObserver();
    }
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

        let texts = image.dataset.ocr || ChealtOcr.getSavedTexts(id);

        if (!texts) {
          image.classList.add(ocrInProgressClass);

          texts = await this.triggerTextExtraction(imageSrc);

          await ChealtOcr.saveOCR({ id, texts, saveEndpoint: this.dataset.saveEndpoint });

          image.classList.remove(ocrInProgressClass);
        }

        if (!image.dataset.ocr) {
          image.setAttribute('data-ocr', texts);
        }
      }
    } catch (error) {
      console.error(error); // eslint-disable-line no-console
    }

    this.isExtracting = false;
  }

  async triggerTextExtraction(imageSrc) {
    const texts = await this.extractText(imageSrc);

    return texts;
  }

  static getSavedTexts(id) {
    const savedTexts = JSON.parse(localStorage.getItem(storageKey));

    return !id ? savedTexts : (savedTexts || {})[id];
  }

  static async saveOCR({ id, texts, saveEndpoint }) {
    const savedTexts = JSON.parse(localStorage.getItem(storageKey)) || {};

    localStorage.setItem(
      storageKey,
      JSON.stringify({
        ...savedTexts,
        [id]: texts
      })
    );

    if (saveEndpoint) {
      const formData = new FormData();

      formData.append('texts', texts);

      return await fetch(`${saveEndpoint}/${id}.ocr`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        credentials: 'same-origin', // allow to set cookies
        body: new URLSearchParams(formData)
      });
    }

    return true;
  }

  disconnectedCallback() {
    this.observer.disconnect();
  }
}

customElements.define('chealt-ocr', ChealtOcr);
