const data = {
  en: {
    registrationEmailSubject: '☕ Register at Central Beans 🫘',
    registrationEmailTitle: 'Register at Central Beans',
    content: ({ username, registrationCode }) => `
      <p>Register on Central Beans by following <a href="https://centralbeans.com/registration/${username}?code=${registrationCode}">this link</a>.</p>
      <p><b>Make sure to open the link in a browser, and NOT in the email app, otherwise the registration will fail.</b></p>
      <p>This link will work for the next 24 hours. Contact support at <a href="mailto:info@centralbeans.com">info@centralbeans.com</a> to receive a new registration link.</p>
    `
  },
  pl: {
    registrationEmailSubject: '☕ Rejestruj się w Central Beans 🫘',
    registrationEmailTitle: 'Rejestruj się w Central Beans',
    content: ({ username, registrationCode }) => `
      <p>Zarejestruj się w Central Beans, klikając <a href="https://centralbeans.com/registration/${username}?code=${registrationCode}">ten link</a>.</p>
      <p><b>Upewnij się, że otwierasz link w przeglądarce, a NIE w aplikacji pocztowej, w przeciwnym razie rejestracja zakończy się niepowodzeniem.</b></p>
      <p>Ten link będzie działał przez następne 24 godziny. Skontaktuj się z pomocą techniczną pod adresem <a href="mailto:info@centralbeans.com">info@centralbeans.com</a>, aby otrzymać nowy link do rejestracji.</p>
    `
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
