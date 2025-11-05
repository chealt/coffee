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

  const parser = parsers[roaster.id];

  if (!parser) {
    throw new Error(`No parser found for ${roaster.id}`);
  }

  const productLinks = await parser({ html: webshopHTML, url: key });
  console.info(`Found ${productLinks.length} products for ${roaster.id} at ${key}`);

  console.info(`Invoking record lambda for ${key}`);
  await Promise.all(
    productLinks.map((productLink) => callRecordWebshopItem({ url: productLink, roasterId: roaster.id }))
  );

  return { success: true };
};

export { handler };
