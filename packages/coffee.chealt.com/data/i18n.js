/* oxlint-disable no-console */
import { createClient } from '@libsql/client';

import { readFile, writeFile } from 'node:fs/promises';

const turso = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

const save = async () => {
  const { rows } = await turso.execute('SELECT * FROM i18n');

  for (const { namespace, key, locale, value } of rows) {
    const path = `./src/components/${namespace.replaceAll('.', '/')}.json`;
    const existingContent = await readFile(path);
    const newContent = JSON.parse(existingContent);

    if (!newContent[locale]) {
      newContent[locale] = {};
    }

    newContent[locale][key] = value;

    await writeFile(path, JSON.stringify(newContent, '', 2), { flag: 'w+' });
  }
};

await save();
