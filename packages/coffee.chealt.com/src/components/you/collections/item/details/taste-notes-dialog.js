class TasteNotesDialog extends HTMLElement {
  connectedCallback() {
    this.dialog = this.querySelector('dialog');

    if (!this.dialog) {
      throw new Error('No dialog found');
    }

    this.dialog.addEventListener('close', () => {
      // refresh the page so that new taste notes show
      window.location.reload();
    });
  }
}

if (!customElements.get('coffee-taste-notes-dialog')) {
  customElements.define('coffee-taste-notes-dialog', TasteNotesDialog);
}
