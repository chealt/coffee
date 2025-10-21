class APIButton extends HTMLElement {
  connectedCallback() {
    this.trigger = this.querySelector('button');
    this.apiEndpoint = this.dataset.apiEndpoint;

    if (!this.trigger) {
      throw new Error('No button found');
    }

    if (!this.apiEndpoint) {
      throw new Error('No API endpoint found, please add [data-api-endpoint] attribute');
    }

    this.trigger.addEventListener('click', this.callEndpoint.bind(this));
  }

  async callEndpoint() {
    this.trigger.disabled = true;
    this.trigger.classList.add('in-progress');

    await fetch(this.apiEndpoint, { method: 'POST' });

    this.trigger.classList.remove('in-progress');
    this.trigger.disabled = false;
  }
}

if (!customElements.get('coffee-api-button')) {
  customElements.define('coffee-api-button', APIButton);
}
