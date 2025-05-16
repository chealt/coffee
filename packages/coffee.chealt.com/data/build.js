import { createClient } from '@libsql/client';

import { writeFile } from 'node:fs/promises';

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

const saveRoasters = async () => {
  const results = await turso.execute('SELECT * FROM roasters ORDER BY name ASC');

  return writeFile('./data/roasters.json', JSON.stringify(results.rows), { flag: 'w+' });
};

const saveRoastingLevels = async () => {
  const results = await turso.execute('SELECT * FROM roasting_levels_all ORDER BY name ASC');

  return writeFile('./data/roastingLevels.json', JSON.stringify(results.rows), { flag: 'w+' });
};

const saveOriginCountries = async () => {
  const results = await turso.execute('SELECT * FROM origin_countries_all ORDER BY name ASC');

  return writeFile('./data/originCountries.json', JSON.stringify(results.rows), { flag: 'w+' });
};

const saveProcessingMethods = async () => {
  const results = await turso.execute('SELECT * FROM processing_methods_all ORDER BY name ASC');

  return writeFile('./data/processingMethods.json', JSON.stringify(results.rows), { flag: 'w+' });
};

await Promise.all([
  saveRoasters(),
  saveRoastingLevels(),
  saveOriginCountries(),
  saveProcessingMethods()
]);
