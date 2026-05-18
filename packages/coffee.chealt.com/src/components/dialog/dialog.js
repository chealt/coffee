class CoffeeDialog extends HTMLElement {
  connectedCallback() {
    this.dialog = this.querySelector('dialog');
    this.closeButton = this.querySelector('[data-close-button]');
    this.triggerButton = this.dialog.id ? document.querySelectorAll(`[data-dialog-id=${this.dialog.id}]`) : undefined;
    this.triggerKey = this.dataset.triggerKey;

    this.addBackdropClickListener();
    this.openOnClick();
    this.closeOnClick();
    this.openOnTriggerKey();

    if (this.dataset.reloadOnChange) {
      this.inputs = this.querySelectorAll('input[type="checkbox"]').forEach((input) => {
        input.addEventListener('change', () => {
          this.hasChanges = true;
        });
      });

      this.dialog.addEventListener('close', () => {
        if (this.hasChanges) {
          window.location.reload();
        }
      });
    }
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

  openOnTriggerKey() {
    document.body.addEventListener('keyup', (event) => {
      if (event.key === this.triggerKey) {
        this.dialog.showModal();
      }
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
