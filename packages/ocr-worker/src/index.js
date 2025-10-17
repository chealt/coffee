/* eslint-disable no-console */
import OCR from './OCR.js';

const filename = process.argv.find((arg) => arg.includes('--filename=')).replace('--filename=', '');

if (!filename) {
  throw new Error('No filename provided');
}

console.info(`Processing file: ${filename}`);

const path = `https://images.centralbeans.com/collection-images/${filename}`;
const response = await fetch(path);

if (!response.ok) {
  throw new Error(`Failed to fetch file: ${path}`);
}

const file = await response.blob();

const fileBuffer = await file.arrayBuffer();

// eslint-disable-next-line new-cap
const ocr = await OCR();

const text = await ocr.extractText(fileBuffer);

console.info(`Extracted text: ${text}`);
