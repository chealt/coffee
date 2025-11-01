import { getContentHash } from '../../../coffee.chealt.com/src/utils/file.js';
import { putObject } from '../AWS.js';
import { readFile } from 'node:fs/promises';

const test = async (filename) => {
  const file = await readFile(filename);

  const newFilename = await getContentHash({ arrayBuffer: file });

  await putObject({ Bucket: 'centralbeans-coffee-images', ContentType: 'image/jpeg', Body: file, Key: newFilename });

  console.log({ newFilename });
};

await test('/Users/bartha.attila/Code/chealt/coffee/packages/coffee-admin/src/test.jpg');
