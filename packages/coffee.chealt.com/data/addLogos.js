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

const data = await readFile(`./data/${filename}.txt`, 'utf-8');
const logos = data.split('\n').filter(Boolean);

const result = await turso.batch(
  logos.map((logoFileName) => ({
    sql: 'UPDATE roasters SET logo = ? WHERE replace(lower(name), " ", "") = replace(replace(replace(replace(replace(lower(?)," ",""), ".jpg", ""),".png",""),".webp",""),".svg","");',
    args: [logoFileName, logoFileName]
  })),
  'write'
);

console.log(result); // eslint-disable-line no-console
