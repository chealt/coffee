/* eslint-disable camelcase, no-console */
import { TranslateClient, TranslateTextCommand } from '@aws-sdk/client-translate';
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

console.info('Querying taste notes...');
const { rows: tasteNotes } = await client.execute({
  sql: 'SELECT tn.id, tn.name FROM taste_notes tn ORDER BY tn.name'
});

console.info('Translating taste notes...');
const polishLanguageId = 1;
await Promise.all(
  tasteNotes.map(async ({ id, name }) => {
    const config = {};
    const translationClient = new TranslateClient(config);
    const input = {
      Text: name,
      SourceLanguageCode: 'en',
      TargetLanguageCode: 'pl'
    };
    const command = new TranslateTextCommand(input);

    try {
      const { TranslatedText: translated } = await translationClient.send(command);
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
