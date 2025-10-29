/* eslint-disable no-console */
import { TextractClient, DetectDocumentTextCommand } from '@aws-sdk/client-textract';
import { createClient } from '@libsql/client';

import { getSecret } from './utils.js';

const saveTexts = async ({ filename, texts }) => {
  const secrets = await getSecret({ name: 'ocrLambda' });

  const authToken = secrets.TURSO_DEFAULT_TOKEN;
  const databaseUrl = secrets.TURSO_DATABASE_URL;

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

  console.info('Adding texts to DB...');
  await client.execute({
    sql: `INSERT INTO collection_image_texts (filename, texts)
            VALUES (:filename, :texts)
          ON CONFLICT (filename) DO UPDATE
            SET texts = :texts`,
    args: { filename, texts: JSON.stringify(texts) }
  });

  console.info('Added texts to the DB');
};

const handler = async (event) => {
  const filename = event.Records[0].s3.object.key;

  const config = {};
  const client = new TextractClient(config);

  const input = {
    Document: {
      S3Object: {
        Bucket: 'centralbeans-coffee-images',
        Name: filename
      }
    }
  };
  const command = new DetectDocumentTextCommand(input);
  const { Blocks } = await client.send(command);
  const texts = Blocks.filter(({ Confidence }) => Confidence > 90).map(({ Text: text }) => text);

  if (texts.length) {
    await saveTexts({ filename, texts });
  }

  return texts;
};

export { handler };
