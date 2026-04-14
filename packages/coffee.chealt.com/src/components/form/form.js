import { formDataToObject } from '../../utils/form.js';
import logger from '../errors/utils.js';

const storageKey = 'chealt-forms';
const supportedStorageTypes = ['localStorage'];
const sumInputSelector =
  'input:not([data-exclude-from-sum])[type="number"],input:not([data-exclude-from-sum])[type="range"]';
const includedInputsSelector = 'input:not([data-exclude]),select:not([data-exclude]),textarea:not([data-exclude])';

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
  form.querySelectorAll(includedInputsSelector).forEach((element) => {
    element.addEventListener('input', (event) => {
      if (event.isTrusted || event.detail?.triggerSave || element.getAttribute('type') === 'hidden') {
        callback(form); // eslint-disable-line callback-return

        form.dispatchEvent(
          new CustomEvent('chealt-form:change', {
            bubbles: true,
            detail: {
              formName: form.name
            }
          })
        );

        return true;
      }

      return undefined;
    });
  });
};

const getFormData = ({ form, storage }) => {
  const urlData = new URLSearchParams(window.location.search);
  const dataFromUrl = urlData.get('data');
  const parsedUrlData = dataFromUrl ? JSON.parse(atob(dataFromUrl)) : undefined;

  switch (storage) {
    case 'localStorage':
    case 'api':
      if (parsedUrlData) {
        return parsedUrlData;
      }

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
  // eslint-disable-next-line complexity
  async (form) => {
    if (!form.name) {
      throw new Error('The form must have a name to save its data.');
    }

    const formData = new FormData(form);

    const excludedInputNames = Array.from(form.querySelectorAll('[data-exclude]') || []).map((element) => element.name);
    excludedInputNames.forEach((name) => formData.delete(name));

    const data = formDataToObject(formData);
    const savedFormData = getAllFormsData(storage);

    if (!form.dataset.excludeFromLocalStorage) {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          ...savedFormData, // this is to keep the data of other forms' on the page
          [form.name]: data
        })
      );
    }

    if (storage === 'api') {
      try {
        form.querySelectorAll(`[data-error-code]`)?.forEach((element) => element.classList.add('hidden'));
        form.querySelectorAll(`[data-success]`)?.forEach((element) => element.classList.add('hidden'));

        const response = await fetch(`${saveEndpoint}/${form.name}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          credentials: 'same-origin', // allow to set cookies
          body: new URLSearchParams(formData)
        });

        if (!response.ok) {
          logger.error(response);
        }

        const result = await response.json();

        if (result.error) {
          logger.error(result.error);
        }

        if (result.errorCode) {
          form.querySelector(`[data-error-code="${result.errorCode}"]`)?.classList.remove('hidden');
        }

        if (result.success) {
          form.querySelector(`[data-success]`)?.classList.remove('hidden');
        }

        if (result.redirectUrl) {
          window.location.assign(result.redirectUrl);
        }
      } catch (error) {
        logger.error(error);
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

const attachShareHandler = ({ form, storage }) => {
  const shareButton = document.querySelector(`[data-share="${form.name}"]`);

  if (!shareButton) {
    logger.error(`Share button not found for form: ${form.name}`);

    return;
  }

  shareButton.addEventListener('click', async () => {
    const data = getFormData({ form, storage });

    if (data) {
      const url = `${window.location.origin}${window.location.pathname}?data=${btoa(JSON.stringify(data))}`;

      try {
        await navigator.share({
          title: form.name,
          text: form.dataset.shareText,
          url
        });

        logger.info('Form shared successfully');
      } catch (err) {
        logger.error(err);
      }
    }
  });
};

const attachResetHandlers = ({ form, resetButtons }) => {
  resetButtons.forEach((resetButton) => {
    resetButton.addEventListener('click', () => {
      form.reset();

      form.querySelectorAll(includedInputsSelector).forEach((element) => {
        element.dispatchEvent(
          new CustomEvent('input', {
            bubbles: true,
            detail: {
              triggerSave: true
            }
          })
        );
      });

      if (window.location.search.includes('?data=')) {
        window.location.replace(`${window.location.origin}${window.location.pathname}`);
      }
    });
  });
};

class ChealtForm extends HTMLElement {
  // eslint-disable-next-line complexity
  connectedCallback() {
    this.form = this.querySelector('form');
    this.name = this.form.getAttribute('name');
    this.storage = this.form.dataset.storage;
    this.saveOnInput = this.form.dataset.saveOnInput || false;
    this.sumGroupName = this.form.dataset.sumGroupName;
    this.saveEndpoint = this.form.dataset.saveEndpoint;
    this.sumGroups = this.form.querySelectorAll('[data-sum-group-name]');
    this.canShare = this.form.dataset.canShare;
    this.resetButtons = document.querySelectorAll(`[data-reset="${this.name}"]`) || [];
    this.updateOnChange = this.form.querySelectorAll('[data-update-keys]');

    if (this.storage) {
      if (this.storage === 'api' && !this.saveEndpoint) {
        logger.error(
          `The API storage type needs to have a sve endpoint data attribute. Please add [data-save-endpoint] to the form.`
        );

        throw new Error(
          `The API storage type needs to have a sve endpoint data attribute. Please add [data-save-endpoint] to the form.`
        );
      }

      if (!ChealtForm.isStorageTypeImplemented(this.storage)) {
        logger.error(
          `Storage type: ${this.storage} is not implemented, use one of the following: ${supportedStorageTypes.join(', ')}`
        );

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
      } else {
        this.form.addEventListener('submit', async (event) => {
          event.preventDefault();

          const submitButton = this.form.querySelector('[type="submit"]');

          if (submitButton) {
            submitButton.disabled = true;
            submitButton.classList.add('in-progress');
          }

          try {
            await saveFormData({ storage: this.storage, saveEndpoint: this.saveEndpoint })(this.form);
          } catch (error) {
            logger.error(error);
          }

          if (submitButton) {
            submitButton.disabled = false;
            submitButton.classList.remove('in-progress');
          }
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

    if (this.canShare) {
      attachShareHandler({ form: this.form, storage: this.storage });
    }

    attachResetHandlers({ form: this.form, resetButtons: this.resetButtons });

    this.attachUpdateOnChangeHandler();
  }

  changeFormDataOnNameChange() {
    const observer = new MutationObserver(() => {
      setFormData({ form: this.form, storage: this.storage });
    });

    observer.observe(this.form, { attributes: true, attributeFilter: ['name'] });

    setFormData({ form: this.form, storage: this.storage });
  }

  attachUpdateOnChangeHandler() {
    this.updateOnChange.forEach((element) => {
      const keysToUpdate = element.dataset.updateKeys.split(',');
      const apiEndpoint = element.dataset.apiEndpoint;
      const staticValues = element.dataset.staticValues ? JSON.parse(element.dataset.staticValues) : {};

      keysToUpdate.forEach((key) => {
        this.querySelector(key)?.addEventListener('input', async () => {
          const data = keysToUpdate.reduce((acc, curr) => {
            const { name, value } = this.querySelector(curr);

            acc[name] = value;

            return acc;
          }, staticValues);

          const response = await fetch(apiEndpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
          });

          if (!response.ok) {
            logger.error(response);
          }

          const { success, values } = await response.json();

          if (success) {
            values.forEach(({ selector, value }) => {
              const elementToUpdate = this.querySelector(selector);

              elementToUpdate.innerHTML = value;
            });
          } else {
            logger.error(`API error: ${response.statusText}`);
          }
        });
      });
    });
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
