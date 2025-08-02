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

      if (!elementToDelete) {
        throw new Error(`Cannot find element to delete with id: ${id}`);
      }

      if (!type) {
        throw new Error('The element to be deleted must have a data-type attribute');
      }

      const confirmMessage =
        elementToDelete.closest('[data-delete-confirm-message]')?.dataset.deleteConfirmMessage ||
        defaults.confirmDeleteMessage;

      deleteTrigger.addEventListener('click', async () => {
        // eslint-disable-next-line no-alert
        if (confirm(confirmMessage)) {
          try {
            await ChealtData.deleteData({ key: type, value: id });

            elementToDelete.remove();

            if (dialog) {
              dialog.close();
            }
          } catch (error) {
            // eslint-disable-next-line no-console
            console.error(error);
          }
        }
      });
    });
  }
}

if (!customElements.get('chealt-data')) {
  customElements.define('chealt-data', ChealtData);
}
