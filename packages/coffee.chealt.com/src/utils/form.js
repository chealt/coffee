const formDataToObject = (formData) =>
  formData.entries().reduce((object, [key, value]) => {
    object[key] = value;

    return object;
  }, {});

const setInputValue = ({ input, value }) => {
  if (value === 'on') {
    input.checked = true;
  } else {
    input.value = value;
  }

  // trigger input event, otherwise event handlers won't execute
  input.dispatchEvent(new Event('input', { bubbles: true }));
};

export { formDataToObject, setInputValue };
