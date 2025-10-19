import { main } from './main.js';

const filename = process.argv.find((arg) => arg.includes('--filename=')).replace('--filename=', '');

if (!filename) {
  throw new Error('No filename provided');
}

await main({ filename });
