import { getAllCollections } from '../../common/storage.js';

class CoffeeGallery extends HTMLElement {
  static refreshEventName = 'coffee-gallery-refresh';

  async connectedCallback() {
    this.collections = this.querySelector('[data-type=collections]');

    this.render();
    this.addRefreshListener();
  }

  async render() {
    const collections = getAllCollections();
    const collectionsToRemove = collections.length > 0
      ? this.collections.querySelectorAll(`[data-collection-id]:not(${collections.map(({ id }) => `[data-collection-id="${id}"]`).join(',')}):not([data-is-built-in])`)
      : undefined;

    collectionsToRemove?.forEach((collection) => {
      collection.remove();
    });

    collections.forEach(async ({ id }) => {
      const existingCollection = this.collections.querySelector(`[data-collection-id="${id}"]`);

      if (!existingCollection) {
        const collectionElementTemplate = document.getElementById('collection-item-template');
        const collectionElementTemplateContent = collectionElementTemplate.content;
        collectionElementTemplateContent.querySelector('[data-collection-id]').setAttribute('data-collection-id', id);

        this.collections.appendChild(collectionElementTemplateContent.cloneNode(true));
      }
    });
  }

  addRefreshListener() {
    document.addEventListener(CoffeeGallery.refreshEventName, () => {
      this.render();
    });
  }
}

customElements.define('coffee-gallery', CoffeeGallery);
