/* eslint-disable camelcase */
import { createClient } from '@libsql/client';

import { readFile } from 'node:fs/promises';

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

const filename = process.argv[2]?.replace('--filename=', '');

if (!filename) {
  throw new Error('No file name provided, please use --filename=<file-name>');
}

const data = JSON.parse(await readFile(`./data/${filename}.json`, 'utf-8'));

const result = await turso.batch(
  data.map(({ name, website, instagram, country_id }) => ({
    sql: 'insert into roasters (name, website, instagram, country_id) values (?, ?, ?, ?)',
    args: [name, website ? website : 'NULL', instagram ? instagram : 'NULL', country_id]
  })),
  'write'
);

console.log(result); // eslint-disable-line no-console
