import { browserSupportsWebAuthn, startRegistration } from '@simplewebauthn/browser';

class ChealtAuth extends HTMLElement {
  connectedCallback() {
    this.checkSupport();
    this.verifyEndpoint = this.dataset.verifyEndpoint;
    this.registrationOptions = JSON.parse(this.dataset.registrationOptions);
    this.redirectUrl = this.dataset.redirectUrl;
    this.registerButton = this.querySelector('button[type="submit"]');
    this.registrationSuccess = this.querySelector('[data-registration-success]');
    this.registrationError = this.querySelector('[data-registration-error]');
    this.registrationErrorAuthenticatorPreviouslyRegistered = this.querySelector(
      '[data-registration-error-authenticator-previously-registered]'
    );

    this.registerOnSubmit();
  }

  checkSupport() {
    if (!browserSupportsWebAuthn) {
      // eslint-disable-next-line no-alert
      window.alert(this.dataset.notSupportedMessage);
    }
  }

  registerOnSubmit() {
    this.registerButton.addEventListener('click', async (event) => {
      event.preventDefault();

      this.registerButton.disabled = true;

      // clear any previous results
      this.registrationSuccess.classList.add('hidden');
      this.registrationError.classList.add('hidden');

      try {
        const registration = await startRegistration({ optionsJSON: this.registrationOptions });

        const response = await fetch(`${this.verifyEndpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'same-origin', // allow to set cookies
          body: JSON.stringify({
            ...registration,
            username: this.registrationOptions.user.name
          })
        });

        const { verified } = await response.json();

        if (verified && this.redirectUrl) {
          if (this.redirectUrl) {
            window.location.href = this.redirectUrl;
          } else {
            this.registrationSuccess.classList.remove('hidden');
          }
        } else {
          this.registrationError.classList.remove('hidden');
        }
      } catch (error) {
        console.error(error); // eslint-disable-line no-console

        if (error.code === 'ERROR_AUTHENTICATOR_PREVIOUSLY_REGISTERED') {
          this.registrationErrorAuthenticatorPreviouslyRegistered.classList.remove('hidden');
        } else {
          this.registrationError.classList.remove('hidden');
        }
      }

      this.registerButton.disabled = false;

      // hide the result after 2 seconds
      setTimeout(() => {
        this.hideRegistrationResult();
      }, 5000);
    });
  }

  hideRegistrationResult() {
    this.registrationSuccess.classList.add('hidden');
    this.registrationError.classList.add('hidden');
  }
}

if (!customElements.get('chealt-auth')) {
  customElements.define('chealt-auth', ChealtAuth);
}
