import { callRecordWebshopItem } from './AWS.js';
import parsers from './parsers.js';

const handler = async (event) => {
  const { roasterId, html, url } = event;

  console.info(`Processing ${url}`);

  if (!url) {
    throw new Error('No url');
  }

  if (!roasterId) {
    throw new Error('No roaster id');
  }

  if (!html) {
    throw new Error('No HTML');
  }

  const parser = parsers[roasterId];

  if (!parser) {
    throw new Error(`No parser found for ${roasterId}`);
  }

  const productLinks = await parser({ html });
  console.info(`Found ${productLinks.length} products at ${url}`);

  // call lambda serially so we don't run into rate limits
  for (const productUrl of productLinks) {
    console.info(`Invoking record lambda for ${productUrl}`);

    await callRecordWebshopItem({ url: productUrl, roasterId });
  }

  return { success: true };
};

export { handler };
