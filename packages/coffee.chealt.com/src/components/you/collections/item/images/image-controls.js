import logger from '@components/errors/utils.js';
import { setItem } from '@utils/storage.js';

class CollectionItemImageControls extends HTMLElement {
  connectedCallback() {
    this.useImageAsCoverTriggers = this.querySelectorAll('[data-use-as-cover-trigger]');

    this.useImageAsCoverTriggers.forEach((element) =>
      element.addEventListener('click', () =>
        CollectionItemImageControls.useImageAsCover({
          filename: element.dataset.imageFilename,
          itemId: this.closest('[data-type="chealt-collection-item"]')?.id
        })
      )
    );
  }

  static async useImageAsCover({ filename, itemId }) {
    if (!filename || !itemId) {
      logger.error('Filename or item id missing from use as cover button');

      return;
    }

    try {
      await setItem('chealt-collection-item-image-use-as-cover', { itemId, filename });

      window.location.reload();
    } catch (error) {
      logger.error(error);
    }
  }
}

if (!customElements.get('coffee-collection-item-image-controls')) {
  customElements.define('coffee-collection-item-image-controls', CollectionItemImageControls);
}
