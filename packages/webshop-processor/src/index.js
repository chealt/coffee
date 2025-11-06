import { callRecordWebshopItem, getObject } from './AWS.js';
import parsers from './parsers.js';
import { getRoaster } from './roasters.js';

const handler = async (event) => {
  const key = decodeURIComponent(event.Records[0].s3.object.key);

  console.info(`Processing ${key}`);
  const [roaster, webshopHTML] = await Promise.all([
    getRoaster(key),
    getObject({ bucketName: 'roaster-webshop', key })
  ]);

  if (!roaster) {
    throw new Error(`No roaster found for ${key}`);
  }

  if (!webshopHTML) {
    throw new Error(`No webshop HTML found for ${key}`);
  }

  const roasterId = roaster.id;
  const parser = parsers[roasterId];

  if (!parser) {
    throw new Error(`No parser found for ${roasterId}`);
  }

  const productLinks = await parser({ html: webshopHTML, url: key });
  console.info(`Found ${productLinks.length} products for ${roasterId} at ${key}`);

  console.info(`Invoking record lambda for ${key}`);
  // call lambda serially so we don't run into rate limits
  for (const url of productLinks) {
    await callRecordWebshopItem({ url, roasterId });
  }

  return { success: true };
};

export { handler };
