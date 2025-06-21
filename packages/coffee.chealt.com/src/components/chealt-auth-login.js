import { startAuthentication } from '@simplewebauthn/browser';

class ChealtAuthLogin extends HTMLElement {
  connectedCallback() {
    this.form = this.querySelector('form');
    this.loginButton = this.querySelector('button');
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

    let optionsJSON = this.authenticationOptions;
    const username = this.querySelector('input[name="username"]').value;

    if (!username) {
      this.form.reportValidity();

      return;
    }

    this.loginButton.disabled = true;

    try {
      if (!optionsJSON) {
        optionsJSON = await this.fetchAuthenticationOptions({ username });
      }

      const response = await startAuthentication({ optionsJSON });

      const verified = await this.verify({ username, response });

      if (verified && this.redirectUrl) {
        window.location.href = this.redirectUrl;
      }
    } catch (error) {
      console.error(error); // eslint-disable-line no-console
    }

    this.loginButton.disabled = false;
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

    const { options } = await authenticationOptions.json();

    return options;
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

    const { verified } = await verification.json();

    return verified;
  }

  disconnectCallback() {
    this.loginButton.removeEventListener('click', this.loginOnSubmit);
  }
}

if (!customElements.get('chealt-auth-login')) {
  customElements.define('chealt-auth-login', ChealtAuthLogin);
}
