/* oxlint-disable no-console */
import { translate } from './AWS.js';
import client from './Turso.js';

console.info('Querying countries...');
const { rows: countries } = await client.execute('SELECT id, name FROM countries ORDER BY name');

console.info('Querying languages...');
const { rows: languages } = await client.execute('SELECT id, name, code FROM languages');

console.info('Querying existing translations...');
const { rows: existingTranslations } = await client.execute('SELECT country_id, language_id FROM countries_i18n');

const existingMap = new Set(existingTranslations.map((t) => `${t.country_id}-${t.language_id}`));

console.info('Translating countries...');

for (const country of countries) {
  for (const language of languages) {
    const key = `${country.id}-${language.id}`;

    if (!existingMap.has(key)) {
      try {
        let translatedText;

        if (language.code === 'en') {
          translatedText = country.name;
        } else {
          // AWS uses 'sl' for Slovenian. If code is 'si' (Sinhala), map it to 'sl' to fix DB mismatch.
          const awsLangCode = language.code === 'si' ? 'sl' : language.code;
          translatedText = await translate({ text: country.name, from: 'en', to: awsLangCode });
        }

        console.info(`Translated '${country.name}' to '${translatedText}' (${language.code})`);

        await client.execute({
          sql: 'INSERT INTO countries_i18n (country_id, language_id, name) VALUES (:countryId, :languageId, :name)',
          args: {
            countryId: country.id,
            languageId: language.id,
            name: translatedText.toLowerCase()
          }
        });

        // Add to map so we don't accidentally insert again if there's a retry logic added later
        existingMap.add(key);
      } catch (error) {
        console.error(`Failed to translate '${country.name}' to '${language.code}':`, error.message);
      }
    }
  }
}

console.info('Done translating countries.');
