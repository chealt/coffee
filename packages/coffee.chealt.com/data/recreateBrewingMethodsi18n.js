/* oxlint-disable no-console */
import { createClient } from '@libsql/client';

import brewingMethods from './brewingMethods.json' with { type: 'json' };

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

const { rows: languages } = await turso.execute('SELECT id, code FROM languages');

await turso.batch(
  brewingMethods.map(({ brewing_method_id: id, name, language_code: languageCode }) => ({
    sql: 'INSERT INTO brewing_methods_i18n (brewing_method_id, name, language_id) VALUES (:id, :name, :languageId)',
    args: { id, name, languageId: languages.find(({ code }) => code === languageCode).id }
  }))
);

console.info('Done!');
