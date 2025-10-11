class TasteNotesDialog extends HTMLElement {
  connectedCallback() {
    this.dialog = this.querySelector('dialog');
    this.hasChanges = false;

    if (!this.dialog) {
      throw new Error('No dialog found');
    }

    this.inputs = this.querySelectorAll('input[type="checkbox"]').forEach((input) => {
      input.addEventListener('change', () => {
        this.hasChanges = true;
      });
    });

    this.dialog.addEventListener('close', () => {
      if (this.hasChanges) {
        // refresh the page so that new taste notes show
        window.location.reload();
      }
    });
  }
}

if (!customElements.get('coffee-taste-notes-dialog')) {
  customElements.define('coffee-taste-notes-dialog', TasteNotesDialog);
}
