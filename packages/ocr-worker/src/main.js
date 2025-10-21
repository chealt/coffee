/* eslint-disable no-console */
import OCR from './OCR.js';
import { memoryUsage } from 'node:process';

const main = async ({ filename }) => {
  if (!filename) {
    throw new Error('No filename provided');
  }

  console.info(`Downloading file: ${filename}`);
  const path = `https://images.centralbeans.com/collection-images/${filename}`;

  performance.mark('download:start');
  const response = await fetch(path);
  performance.mark('download:end');

  console.info(`Memory usage: ${JSON.stringify(memoryUsage())}`);

  const { duration: downloadDuration } = performance.measure('download', 'download:start', 'download:end');
  console.info(`Download took ${downloadDuration}ms`);

  if (!response.ok) {
    throw new Error(`Failed to fetch file: ${path}`);
  }

  const file = await response.blob();

  const fileBuffer = await file.arrayBuffer();

  console.info(`Processing file: ${filename}`);
  // eslint-disable-next-line new-cap
  const ocr = await OCR();

  console.info(`Memory usage: ${JSON.stringify(memoryUsage())}`);

  const text = await ocr.extractText(fileBuffer);

  console.info(`Memory usage: ${JSON.stringify(memoryUsage())}`);
  console.info(`Extracted text: ${text}`);

  return { text, filename };
};

export { main };
