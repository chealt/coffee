import roasters from '../../../data/roasters.json';

class CoffeeDetails extends HTMLElement {
  connectedCallback() {
    this.renderInitDetails();
    this.addMutationObserver();
    this.addToggleButtonEvent();
    this.addCloseOnEscEvent();
  }

  renderInitDetails() {
    const template = document.getElementById('coffee-details-template');
    const templateContent = template.content;

    this.appendChild(templateContent.cloneNode(true));
  }

  addMutationObserver() {
    this.observer = new MutationObserver((mutation) => {
      const element = mutation[0].target;

      const ocrTexts = element.getAttribute('data-chealt-ocr').split(',');

      const details = CoffeeDetails.identifyDetails(ocrTexts);

      this.render(details);
    });

    this.observer.observe(this.querySelector('img'), { attributes: true });
  }

  addToggleButtonEvent() {
    this.toggleButtonEvent = this.querySelector('button').addEventListener('click', () => {
      const details = this.querySelector('details');

      details.open = !details.open;
    });
  }

  addCloseOnEscEvent() {
    this.closeOnEscEvent = this.addEventListener('keyup', (event) => {
      if (event.key === 'Escape') {
        this.querySelector('details').open = false;
      }
    });
  }

  static identifyDetails(ocrTexts) {
    const roaster = CoffeeDetails.identifyRoaster(ocrTexts);

    return {
      roaster
    };
  }

  static identifyRoaster(ocrTexts) {
    return roasters.find(({ name }) => ocrTexts.some((text) => text.toLowerCase().includes(name)));
  }

  render({ roaster }) {
    if (roaster) {
      this.querySelector('[name=roaster]').value = roaster.id;
    }
  }

  disconnectedCallback() {
    this.observer.disconnect();

    // remove event listeners
    this.removeEventListener(this.closeOnEscEvent);
    this.querySelector('button').removeEventListener(this.toggleButtonEvent);
  }
}

customElements.define('coffee-details', CoffeeDetails);
