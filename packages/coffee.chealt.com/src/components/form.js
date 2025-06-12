import { formDataToObject } from '../utils/form';

const storageKey = 'chealt-forms';
const supportedStorageTypes = ['localStorage'];

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

  localStorage.setItem(storageKey, JSON.stringify({
    ...savedFormData, // this is to keep the data of other forms' on the page
    [form.name]: data
  }));
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
  }
};

const removeDeletedFormData = (storage) => (mutationsList) => {
  mutationsList.forEach(({ removedNodes }) => {
    if (removedNodes) {
      removedNodes
        .forEach((node) => {
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

    if (this.storage) {
      if (!ChealtForm.isStorageTypeImplemented(this.storage)) {
        throw new Error(`Storage type: ${this.storage} is not implemented, use one of the following: ${supportedStorageTypes.join(', ')}`);
      }

      this.changeFormDataOnNameChange();

      if (this.saveOnInput) {
        addChangeEvent({ form: this.form, callback: saveFormData(this.storage) });
      }

      ChealtForm.observeNodeDeletion(this.storage);
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
