import { startAuthentication } from '@simplewebauthn/browser';

import logger from './errors/utils.js';

class ChealtAuthLogin extends HTMLElement {
  connectedCallback() {
    this.form = this.querySelector('form');
    this.loginButton = this.querySelector('button[type="submit"]');
    this.verifyEndpoint = this.dataset.verifyEndpoint;
    this.authenticationOptionsEndpoint = this.dataset.authenticationOptionsEndpoint;
    this.authenticationOptions = this.dataset.authenticationOptions
      ? JSON.parse(this.dataset.authenticationOptions)
      : undefined;
    this.redirectUrl = this.dataset.redirectUrl;

    if (!this.authenticationOptions) {
      if (!this.authenticationOptionsEndpoint) {
        throw new Error('Authentication options endpoint is required');
      }
    }

    this.loginButton.addEventListener('click', this.loginOnSubmit.bind(this));
  }

  async loginOnSubmit(event) {
    event.preventDefault();

    this.hideErrors();

    let optionsJSON = this.authenticationOptions;
    const username = this.querySelector('input[name="username"]').value;

    if (!username) {
      this.form.reportValidity();

      return;
    }

    this.loginButton.disabled = true;

    try {
      if (!optionsJSON) {
        const { options, errorCode } = await this.fetchAuthenticationOptions({ username });

        if (!options) {
          this.showError(errorCode);
          this.loginButton.disabled = false;

          return;
        }

        optionsJSON = options;
      }

      const response = await startAuthentication({ optionsJSON });

      const { verified, errorCode } = await this.verify({ username, response });

      if (!verified) {
        this.authenticationOptions = undefined;

        this.showError(errorCode);
      } else if (this.redirectUrl) {
        window.location.href = this.redirectUrl;
      }
    } catch (error) {
      logger.error(error);
    }

    this.loginButton.disabled = false;
  }

  hideErrors() {
    this.querySelectorAll('[data-error-code]').forEach((errorElement) => {
      errorElement.classList.add('hidden');
    });
  }

  showError(errorCode) {
    const errorElement =
      this.querySelector(`[data-error-code="${errorCode}"]`) ??
      this.querySelector('[data-error-code="API_CALL_FAILED"]');

    errorElement?.classList.remove('hidden');
  }

  async fetchAuthenticationOptions({ username }) {
    const authenticationOptions = await fetch(this.authenticationOptionsEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'same-origin', // allow to set cookies
      body: JSON.stringify({ username })
    });

    return await authenticationOptions.json();
  }

  async verify({ username, response }) {
    const verification = await fetch(this.verifyEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'same-origin', // allow to set cookies
      body: JSON.stringify({ username, ...response })
    });

    return await verification.json();
  }

  disconnectCallback() {
    this.loginButton.removeEventListener('click', this.loginOnSubmit);
  }
}

if (!customElements.get('chealt-auth-login')) {
  customElements.define('chealt-auth-login', ChealtAuthLogin);
}
