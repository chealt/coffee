import logger from './errors/utils.js';

const defaults = {
  confirmDeleteMessage: 'Are you sure?'
};

class ChealtData extends HTMLElement {
  static async deleteData({ key, value }) {
    const response = await fetch('/api/storage/delete-item.json', {
      method: 'DELETE',
      body: JSON.stringify({ key, value })
    });

    return response.json();
  }

  connectedCallback() {
    this.deleteOnClick.bind(this)();
  }

  deleteOnClick() {
    this.querySelectorAll('[data-delete-trigger]').forEach((deleteTrigger) => {
      const id = deleteTrigger.getAttribute('for');
      const elementToDelete = document.getElementById(id);
      const type = elementToDelete.dataset.type;
      const dialog = deleteTrigger.closest('dialog');
      const redirectUrl = deleteTrigger.dataset.redirectUrl;

      if (!elementToDelete) {
        logger.error(`Cannot find element to delete with id: ${id}`);

        throw new Error(`Cannot find element to delete with id: ${id}`);
      }

      if (!type) {
        logger.error('The element to be deleted must have a data-type attribute');

        throw new Error('The element to be deleted must have a data-type attribute');
      }

      const confirmMessage =
        elementToDelete.closest('[data-delete-confirm-message]')?.dataset.deleteConfirmMessage ||
        defaults.confirmDeleteMessage;

      deleteTrigger.addEventListener('click', async () => {
        // eslint-disable-next-line no-alert
        if (confirm(confirmMessage)) {
          deleteTrigger.classList.add('in-progress');

          try {
            await ChealtData.deleteData({ key: type, value: id });

            if (!deleteTrigger.dataset.dontRemoveElement) {
              elementToDelete.remove();
            }

            if (dialog && !deleteTrigger.dataset.dontCloseDialog) {
              dialog.close();
            }

            if (redirectUrl) {
              window.location.assign(redirectUrl);
            }
          } catch (error) {
            logger.error(error);
          }
        }

        deleteTrigger.classList.remove('in-progress');
      });
    });
  }
}

if (!customElements.get('chealt-data')) {
  customElements.define('chealt-data', ChealtData);
}
