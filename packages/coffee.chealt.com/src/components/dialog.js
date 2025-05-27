class CoffeeDialog extends HTMLElement {
  connectedCallback() {
    this.addBackdropClickListener();
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
}

if (!customElements.get('coffee-dialog')) {
  customElements.define('coffee-dialog', CoffeeDialog);
}
