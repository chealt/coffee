class ChealtAuthLogout extends HTMLElement {
  constructor() {
    super();

    this.logout = this.logout.bind(this);
  }

  connectedCallback() {
    this.logoutTrigger = this.querySelector('[data-logout-trigger]');
    this.logoutUrl = this.dataset.logoutUrl;

    if (!this.logoutTrigger) {
      throw new Error('No logout trigger found, add the attribute `data-logout-trigger` to one of the child elements');
    }

    if (!this.logoutUrl) {
      throw new Error('No logout url found, add the attribute `data-logout-url` to the custom element');
    }

    this.logoutTrigger.addEventListener('click', this.logout);
  }

  async logout() {
    const response = await fetch(this.logoutUrl, {
      credentials: 'include'
    });

    if (response.ok) {
      const { redirectUrl } = await response.json();

      window.location.assign(redirectUrl);
    } else {
      throw new Error('Logout failed');
    }
  }

  disconnectedCallback() {
    this.logoutTrigger.removeEventListener('click', this.logout);
  }
}

if (!customElements.get('chealt-auth-logout')) {
  customElements.define('chealt-auth-logout', ChealtAuthLogout);
}
