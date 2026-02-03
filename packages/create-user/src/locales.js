const data = {
  en: {
    registrationEmailSubject: '☕ Register at Central Beans 🫘',
    registrationEmailTitle: 'Register at Central Beans'
  },
  pl: {
    registrationEmailSubject: '☕ Rejestruj się w Central Beans 🫘',
    registrationEmailTitle: 'Rejestruj się w Central Beans'
  }
};

const locales =
  ({ locale }) =>
  (path, params = {}) => {
    if (!data[locale]) {
      throw new Error(`Locale ${locale} not found`);
    } else if (!data[locale][path]) {
      throw new Error(`Locale path ${path} not found for locale ${locale}`);
    } else if (typeof data[locale][path] === 'function') {
      return data[locale][path](params);
    } else {
      return data[locale][path];
    }
  };

export default locales;
