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
    element.addEventListener('input', (event) => {
      if (event.isTrusted) {
        return callback(form);
      }

      return undefined;
    });
  });
};

const getFormData = ({ form, storage }) => {
  switch (storage) {
    case 'localStorage':
    case 'api':
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
    case 'api':
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
    case 'api':
      const allData = getAllFormsData(storage);

      delete allData[formName];

      localStorage.setItem(storageKey, JSON.stringify(allData));

      return allData;
    default:
      return undefined;
  }
};

const saveFormData =
  ({ storage, saveEndpoint }) =>
  async (form) => {
    if (!form.name) {
      throw new Error('The form must have a name to save its data.');
    }

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

    if (storage === 'api') {
      try {
        const response = await fetch(`${saveEndpoint}/${form.name}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          credentials: 'same-origin', // allow to set cookies
          body: new URLSearchParams(formData)
        });

        if (!response.ok) {
          // eslint-disable-next-line no-console
          console.error(response);
        }

        const result = await response.json();

        if (result.error) {
          // eslint-disable-next-line no-console
          console.error(result.error);
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(error);
      }
    }
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
    this.storage = this.form.dataset.storage;
    this.saveOnInput = this.form.dataset.saveOnInput || false;
    this.sumGroupName = this.form.dataset.sumGroupName;
    this.saveEndpoint = this.form.dataset.saveEndpoint;
    this.sumGroups = this.form.querySelectorAll('[data-sum-group-name]');

    if (this.storage) {
      if (this.storage === 'api' && !this.saveEndpoint) {
        throw new Error(
          `The API storage type needs to have a sve endpoint data attribute. Please add [data-save-endpoint] to the form.`
        );
      }

      if (!ChealtForm.isStorageTypeImplemented(this.storage)) {
        throw new Error(
          `Storage type: ${this.storage} is not implemented, use one of the following: ${supportedStorageTypes.join(', ')}`
        );
      }

      this.changeFormDataOnNameChange();

      if (this.saveOnInput) {
        addChangeEvent({
          form: this.form,
          callback: saveFormData({ storage: this.storage, saveEndpoint: this.saveEndpoint })
        });
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
      case 'api':
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
