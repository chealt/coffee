import { createClient } from '@libsql/client';

import { writeFile } from 'node:fs/promises';

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

const results = await turso.execute('SELECT * FROM roasters ORDER BY name ASC');
const roasters = results.rows;

await writeFile('./data/roasters.json', JSON.stringify(roasters), { flag: 'w+' });
