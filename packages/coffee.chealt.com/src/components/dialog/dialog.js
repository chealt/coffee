class CoffeeDialog extends HTMLElement {
  connectedCallback() {
    this.dialog = this.querySelector('dialog');
    this.closeButton = this.querySelector('[data-close-button]');
    this.triggerButton = this.dialog.id ? document.querySelectorAll(`[data-dialog-id=${this.dialog.id}]`) : undefined;

    this.addBackdropClickListener();
    this.openOnClick();
    this.closeOnClick();
  }

  addBackdropClickListener() {
    this.querySelector('dialog').addEventListener('click', (event) => {
      const dialog = event.currentTarget;
      const rect = dialog.getBoundingClientRect();
      const isInDialog =
        rect.top <= event.clientY &&
        event.clientY <= rect.top + rect.height &&
        rect.left <= event.clientX &&
        event.clientX <= rect.left + rect.width;

      if (!isInDialog) {
        dialog.close();
      }
    });
  }

  openOnClick() {
    this.triggerButton?.forEach((button) => {
      button.addEventListener('click', (event) => {
        event.preventDefault();

        this.dialog.showModal();
      });
    });
  }

  closeOnClick() {
    this.closeButton?.addEventListener('click', () => {
      this.dialog.close();
    });
  }
}

if (!customElements.get('coffee-dialog')) {
  customElements.define('coffee-dialog', CoffeeDialog);
}
