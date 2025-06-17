import { formDataToObject } from '../../utils/form.js';

const storageKey = 'chealt-forms';
const supportedStorageTypes = ['localStorage'];
const sumInputSelector =
  'input:not([data-exclude-from-sum])[type="number"],input:not([data-exclude-from-sum])[type="range"]';

const calculateSum = (sumGroup) => {
  const multiplierInputNames = Array.from(sumGroup.querySelectorAll('[data-multiplier]')).map(
    (input) => input.dataset.multiplier
  );
  const sumElement = sumGroup.querySelector(`[data-sum="${sumGroup.dataset.sumGroupName}"]`);
  const sum = Array.from(sumGroup.querySelectorAll(sumInputSelector)).reduce((acc, curr) => {
    // exclude inputs that are multipliers
    if (multiplierInputNames.includes(curr.name)) {
      return acc;
    }

    const multiplier = curr.dataset.multiplier;
    const negative = curr.dataset.negative;
    let value = negative ? -1 * Number(curr.value) : Number(curr.value);

    if (multiplier) {
      const multiplierElement = curr.form.querySelector(`[name="${multiplier}"]`);
      const multiplierValue = multiplierElement.dataset.negative
        ? -1 * Number(multiplierElement.value)
        : Number(multiplierElement.value);

      value *= multiplierValue;
    }

    return acc + value;
  }, 0);

  sumElement.textContent = sum;
};

const calculateSumOnInput = (sumGroup) => {
  // calculate sum on load
  calculateSum(sumGroup);

  sumGroup.querySelectorAll(sumInputSelector).forEach((input) => {
    input.addEventListener('input', () => {
      calculateSum(sumGroup);
    });
  });
};

const addChangeEvent = ({ form, callback }) => {
  form.querySelectorAll('input,select').forEach((element) => {
    element.addEventListener('input', () => {
      callback(form);
    });
  });
};

const getFormData = ({ form, storage }) => {
  switch (storage) {
    case 'localStorage':
      const dataInStorage = localStorage.getItem(storageKey);
      const data = dataInStorage ? JSON.parse(dataInStorage) : {};

      return data[form.name];
    default:
      return undefined;
  }
};

const getAllFormsData = (storage) => {
  switch (storage) {
    case 'localStorage':
      const dataInStorage = localStorage.getItem(storageKey);
      const data = dataInStorage ? JSON.parse(dataInStorage) : {};

      return data;
    default:
      return undefined;
  }
};

const removeFormData = ({ storage, formName }) => {
  switch (storage) {
    case 'localStorage':
      const allData = getAllFormsData(storage);

      delete allData[formName];

      localStorage.setItem(storageKey, JSON.stringify(allData));

      return allData;
    default:
      return undefined;
  }
};

const saveFormData = (storage) => (form) => {
  const formData = new FormData(form);
  const data = formDataToObject(formData);
  const savedFormData = getAllFormsData(storage);

  localStorage.setItem(
    storageKey,
    JSON.stringify({
      ...savedFormData, // this is to keep the data of other forms' on the page
      [form.name]: data
    })
  );
};

const setFormData = ({ form, storage }) => {
  const data = getFormData({ form, storage });

  if (data) {
    for (const [name, value] of Object.entries(data)) {
      if (value === 'on') {
        document.forms[form.name][name].checked = true;
      } else {
        document.forms[form.name][name].value = value;
      }
    }

    if (form.dataset.sumGroupName) {
      calculateSum(form);
    }
  } else {
    form.reset();
  }
};

const removeDeletedFormData = (storage) => (mutationsList) => {
  mutationsList.forEach(({ removedNodes }) => {
    if (removedNodes) {
      removedNodes.forEach((node) => {
        if (node.nodeType !== Node.TEXT_NODE) {
          node.querySelectorAll('chealt-form form').forEach((form) => {
            removeFormData({ storage, formName: form.name });
          });
        }
      });
    }
  });
};

let isNodeDeletionObserved = false;

class ChealtForm extends HTMLElement {
  connectedCallback() {
    this.form = this.querySelector('form');
    this.name = this.form.getAttribute('name');
    this.storage = this.form.getAttribute('data-storage');
    this.saveOnInput = this.form.getAttribute('data-save-on-input') || false;
    this.sumGroupName = this.form.getAttribute('data-sum-group-name');
    this.sumGroups = this.form.querySelectorAll('[data-sum-group-name]');

    if (this.storage) {
      if (!ChealtForm.isStorageTypeImplemented(this.storage)) {
        throw new Error(
          `Storage type: ${this.storage} is not implemented, use one of the following: ${supportedStorageTypes.join(', ')}`
        );
      }

      this.changeFormDataOnNameChange();

      if (this.saveOnInput) {
        addChangeEvent({ form: this.form, callback: saveFormData(this.storage) });
      }

      ChealtForm.observeNodeDeletion(this.storage);
    }

    if (this.sumGroups.length > 0) {
      this.sumGroups.forEach((sumGroup) => {
        calculateSumOnInput(sumGroup);
      });
    }

    if (this.sumGroupName) {
      calculateSumOnInput(this.form);
    }
  }

  changeFormDataOnNameChange() {
    const observer = new MutationObserver(() => {
      setFormData({ form: this.form, storage: this.storage });
    });

    observer.observe(this.form, { attributes: true, attributeFilter: ['name'] });

    setFormData({ form: this.form, storage: this.storage });
  }

  static isStorageTypeImplemented(storage) {
    switch (storage) {
      case 'localStorage':
        return true;
      default:
        return false;
    }
  }

  static observeNodeDeletion(storage) {
    if (!isNodeDeletionObserved) {
      const observer = new MutationObserver(removeDeletedFormData(storage));

      observer.observe(document.body, { childList: true, subtree: true });

      isNodeDeletionObserved = true;
    }
  }
}

customElements.define('chealt-form', ChealtForm);
