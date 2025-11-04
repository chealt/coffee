import { addWebshopItemDetails, getObject, getObjectMetadata } from './AWS.js';
import parsers from './parsers.js';

const handler = async (event) => {
  const { key } = event.Records[0].s3.object;

  const [webshopItemHTML, metadata] = await Promise.all([
    getObject({ bucketName: 'roaster-webshop-item', key }),
    getObjectMetadata({ bucketName: 'roaster-webshop-item', key })
  ]);

  if (!metadata?.roasterid) {
    throw new Error(`No roaster id found for ${key}, got metadata: ${JSON.stringify(metadata)}`);
  }

  if (!webshopItemHTML) {
    throw new Error(`No webshop HTML found for ${key}`);
  }

  const roasterId = Number(metadata.roasterid);

  const parser = parsers[roasterId];

  if (!parser) {
    throw new Error(`No parser found for ${roasterId}`);
  }

  const details = await parser({ html: webshopItemHTML, url: key, roasterId });

  await addWebshopItemDetails({ url: key, details });

  return { success: true };
};

export { handler };
