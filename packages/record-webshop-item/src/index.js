import { callWebshopItemProcessor } from './AWS.js';
import { deflateSync } from 'node:zlib';

const handler = async (event) => {
  const { roasterId, url } = event;

  if (!roasterId) {
    throw new Error(`roasterId is missing from the event`);
  }

  if (!url) {
    throw new Error(`url is missing from the event`);
  }

  console.info(`Recording webshop for ${roasterId}`);

  console.info(`Fetching webshop item page ${url}`);

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch webshop item page ${url}`);
  }

  const html = (await response.text()).match(/<body[^>]*>[\s\S]*<\/body>/giu)[0];

  console.info(`Recording webshop item page for "${url}" and roaster id: ${roasterId}`);

  await callWebshopItemProcessor({ url, html: deflateSync(html).toString('base64'), roasterId });

  return { success: true };
};

export { handler };
