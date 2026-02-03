import logger from '../errors/utils.js';

class APIButton extends HTMLElement {
  connectedCallback() {
    this.usernameField = this.closest('form')?.querySelector('input[name="username"]');
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

  async callEndpoint(event) {
    event.preventDefault();

    const form = this.closest('form');

    form?.querySelectorAll('[data-error-code]').forEach((element) => element.classList.add('hidden'));
    this.trigger.disabled = true;
    this.trigger.classList.add('in-progress');

    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        body: this.usernameField ? JSON.stringify({ username: this.usernameField.value }) : undefined
      });
      const responseJSON = await response.json();

      if (responseJSON.errorCode) {
        form.querySelector(`[data-error-code="${responseJSON.errorCode}"]`)?.classList.remove('hidden');
      }
    } catch (error) {
      logger.error(error);

      form.querySelector('[data-error-code="API_CALL_FAILED"]')?.classList.remove('hidden');
    }

    this.trigger.classList.remove('in-progress');
    this.trigger.disabled = false;
  }
}

if (!customElements.get('coffee-api-button')) {
  customElements.define('coffee-api-button', APIButton);
}
