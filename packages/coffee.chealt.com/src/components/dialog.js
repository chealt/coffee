class CoffeeDialog extends HTMLElement {
  connectedCallback() {
    this.dialog = this.querySelector('dialog');
    this.triggerButton = this.dialog.id && document.querySelector(`[data-dialog-id=${this.dialog.id}]`);

    this.addBackdropClickListener();

    if (this.triggerButton) {
      this.openOnClick();
    }
  }

  addBackdropClickListener() {
    this.querySelector('dialog').addEventListener('click', (event) => {
      const dialog = event.currentTarget;
      const rect = dialog.getBoundingClientRect();
      const isInDialog = (rect.top <= event.clientY && event.clientY <= rect.top + rect.height &&
          rect.left <= event.clientX && event.clientX <= rect.left + rect.width);

      if (!isInDialog) {
        dialog.close();
      }
    });
  }

  openOnClick() {
    this.triggerButton.addEventListener('click', () => {
      this.dialog.showModal();
    });
  }
}

if (!customElements.get('coffee-dialog')) {
  customElements.define('coffee-dialog', CoffeeDialog);
}
