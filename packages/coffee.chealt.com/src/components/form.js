import { formDataToObject } from '../utils/form';

const storageKey = 'chealt-forms';

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
    throw new Error(`Storage method: '${storage}', not implemented.`);
  }
};

const getAllFormsData = (storage) => {
  switch (storage) {
  case 'localStorage':
    const dataInStorage = localStorage.getItem(storageKey);
    const data = dataInStorage ? JSON.parse(dataInStorage) : {};

    return data;
  default:
    throw new Error(`Storage method: '${storage}', not implemented.`);
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
      document.forms[form.name][name].value = value;
    }
  }
};

class ChealtForm extends HTMLElement {
  connectedCallback() {
    this.form = this.querySelector('form');
    this.name = this.form.getAttribute('name');
    this.storage = this.form.getAttribute('data-storage');
    this.saveOnInput = this.form.getAttribute('data-save-on-input') || false;

    if (this.storage) {
      setFormData({ form: this.form, storage: this.storage });

      if (this.saveOnInput) {
        addChangeEvent({ form: this.form, callback: saveFormData(this.storage) });
      }
    }
  }
}

customElements.define('chealt-form', ChealtForm);
