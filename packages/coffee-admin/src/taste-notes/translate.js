/* eslint-disable no-console */
import { createClient } from '@libsql/client';

import { translate } from '../translate.js';

const authToken = process.env.TURSO_DEFAULT_TOKEN;
const databaseUrl = process.env.TURSO_DATABASE_URL;

if (!databaseUrl) {
  throw new Error('TURSO_DATABASE_URL is not set');
}

if (!authToken) {
  throw new Error('TURSO_DEFAULT_TOKEN is not set');
}

const client = createClient({
  url: databaseUrl,
  authToken
});

console.info('Querying taste notes...');
const { rows: tasteNotes } = await client.execute({
  sql: 'SELECT tn.id, tn.name FROM taste_notes tn ORDER BY tn.name'
});

console.info('Translating taste notes...');
const polishLanguageId = 1;
await Promise.all(
  tasteNotes.map(async ({ id, name }) => {
    try {
      const translated = await translate({ text: name, from: 'en', to: 'pl' });

      console.info(`Translated '${name}' to '${translated}'`);

      console.info(`Inserting translated taste note '${translated}'...`);
      await client.execute({
        sql: 'INSERT OR IGNORE INTO taste_notes_i18n (taste_note_id, name, language_id) VALUES (:id, :name, :languageId)',
        args: {
          id,
          name: translated,
          languageId: polishLanguageId
        }
      });
    } catch (error) {
      console.error(error);
    }
  })
);
