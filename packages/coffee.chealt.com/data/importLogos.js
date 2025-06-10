import { createWriteStream } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { get } from 'node:https';

const fileName = process.argv[2]?.replace('--fileName=', '');

if (!fileName) {
  throw new Error('No file name provided, please use --fileName=<file-name>');
}

const data = JSON.parse(await readFile(`./data/${fileName}.json`, 'utf-8'));

for (const logoUrl of data) {
  const logoFileName = logoUrl.split('/').pop().toLowerCase();
  const file = createWriteStream(`./public/roasters/${logoFileName}`);

  get(logoUrl, (response) => {
    response.pipe(file);

    file.on('finish', () => {
      file.close();
    });
  });
}

