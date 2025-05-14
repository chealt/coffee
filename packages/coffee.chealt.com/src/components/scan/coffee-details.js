import roasters from '../../../data/roasters.json';
import roastingLevels from '../../../data/roastingLevels.json';
import { setInputValue } from '../../utils/form';
import { normalize } from '../../utils/string';

class CoffeeDetails extends HTMLElement {
  connectedCallback() {
    this.name = this.getAttribute('data-name'); // unique identifier to use for storage

    this.renderInitDetails();
    this.addMutationObserver();
    this.addToggleButtonEvent();
    this.addCloseOnEscEvent();

    this.setDetailsFormName(); // the form name needs to be unique in the document
  }

  setDetailsFormName() {
    this.querySelector('form').setAttribute('name', this.name);
  }

  renderInitDetails() {
    const template = document.getElementById('coffee-details-template');
    const templateContent = template.content;

    this.appendChild(templateContent.cloneNode(true));
  }

  addMutationObserver() {
    this.observer = new MutationObserver((mutation) => {
      const element = mutation[0].target;

      const ocrTexts = element.getAttribute('data-chealt-ocr')?.split(',');

      if (ocrTexts) {
        const details = CoffeeDetails.identifyDetails(ocrTexts);

        this.render(details);
      }
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
    const roastingLevel = CoffeeDetails.identifyRoastingLevel(ocrTexts);

    return {
      roaster,
      roastingLevel
    };
  }

  static identifyRoaster(ocrTexts) {
    return roasters
      .find(({ name }) => ocrTexts.some((text) => text.toLowerCase().includes(normalize(name.toLowerCase()))));
  }

  static identifyRoastingLevel(ocrTexts) {
    return roastingLevels
      .find(({ name }) => ocrTexts.some((text) => text.toLowerCase().includes(normalize(name.toLowerCase()))));
  }

  render({ roaster, roastingLevel }) {
    if (roaster) {
      const roasterInput = this.querySelector('[name=roaster]');

      // don't overwrite values set by the user or loaded from storage
      if (roasterInput.value === '') {
        setInputValue({ input: roasterInput, value: roaster.id });
      }
    }

    if (roastingLevel) {
      const roastingLevelInput = this.querySelector('[name=roastingLevel]');

      // don't overwrite values set by the user or loaded from storage
      if (roastingLevelInput.value === '') {
        setInputValue({ input: roastingLevelInput, value: roastingLevel.roasting_level_id });
      }
    }
  }

  disconnectedCallback() {
    this.observer.disconnect();

    // remove event listeners
    this.removeEventListener('keyup', this.closeOnEscEvent);
    this.querySelector('button').removeEventListener('click', this.toggleButtonEvent);
  }
}

customElements.define('coffee-details', CoffeeDetails);
