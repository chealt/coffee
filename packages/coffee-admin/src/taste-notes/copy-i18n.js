/* eslint-disable camelcase, no-console */
import { createClient } from '@libsql/client';

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

console.info('Querying taste note sub groups...');
const { rows: tasteNoteSubGroups } = await client.execute({
  sql: 'SELECT * FROM taste_note_sub_groups'
});

const englishLanguageId = 2;
console.info('Copying taste note sub groups into i18n for English...');
await client.batch(
  tasteNoteSubGroups.map(({ id, name }) => ({
    sql: 'INSERT OR IGNORE INTO taste_note_sub_groups_i18n (taste_note_sub_group_id, name, language_id) VALUES (:id, :name, :englishLanguageId)',
    args: { id, name, englishLanguageId }
  }))
);

const polishLanguageId = 1;
console.info('Copying taste note sub groups into i18n for Polish ...');
await client.batch(
  tasteNoteSubGroups.map(({ id, name }) => ({
    sql: 'INSERT OR IGNORE INTO taste_note_sub_groups_i18n (taste_note_sub_group_id, name, language_id) VALUES (:id, :name, :polishLanguageId)',
    args: { id, name, polishLanguageId }
  }))
);
console.info('Querying taste note groups...');
const { rows: tasteNoteGroups } = await client.execute({
  sql: 'SELECT * FROM taste_note_groups'
});

console.info('Copying taste note groups into i18n for English...');
await client.batch(
  tasteNoteGroups.map(({ id, name }) => ({
    sql: 'INSERT OR IGNORE INTO taste_note_groups_i18n (taste_note_group_id, name, language_id) VALUES (:id, :name, :englishLanguageId)',
    args: { id, name, englishLanguageId }
  }))
);

console.info('Copying taste note groups into i18n for Polish ...');
await client.batch(
  tasteNoteGroups.map(({ id, name }) => ({
    sql: 'INSERT OR IGNORE INTO taste_note_groups_i18n (taste_note_group_id, name, language_id) VALUES (:id, :name, :polishLanguageId)',
    args: { id, name, polishLanguageId }
  }))
);
