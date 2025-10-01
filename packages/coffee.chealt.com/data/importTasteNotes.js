/* eslint-disable no-console */
import { createClient } from '@libsql/client';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

const { rows: tasteNotes } = await client.execute({
  sql: 'SELECT * FROM taste_notes tn LEFT JOIN taste_notes_i18n tni ON tni.taste_note_id = tn.id WHERE tni.id IS NULL'
});

console.info(`Importing ${tasteNotes.length} taste notes...`);

await client.batch(
  tasteNotes.map(({ id, name }) => ({
    sql: 'INSERT INTO taste_notes_i18n (taste_note_id, language_id, name) VALUES (:id, :languageId, :name)',
    args: {
      id,
      languageId: 1,
      name
    }
  }))
);

await client.batch(
  tasteNotes.map(({ id, name }) => ({
    sql: 'INSERT INTO taste_notes_i18n (taste_note_id, language_id, name) VALUES (:id, :languageId, :name)',
    args: {
      id,
      languageId: 2,
      name
    }
  }))
);
