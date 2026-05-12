import supportedLanguages from '@data/supportedLanguages.json' with { type: 'json' };

const defaultLocale = supportedLanguages.find(({ isDefault }) => isDefault)?.locale || 'en';

const localesModules = import.meta.glob('@components/**/locales.json', { import: 'default' });

const getTranslator = async ({ filePath, locale }) => {
  const filePathKey = Object.keys(localesModules).find((k) => k.endsWith(`/${filePath}/locales.json`));
  const translations = await localesModules[filePathKey]();

  const localeTranslations = translations[locale] || translations[defaultLocale];

  return (key) => localeTranslations[key] || translations[defaultLocale][key];
};

export { getTranslator };
