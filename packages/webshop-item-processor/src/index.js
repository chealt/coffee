import { addWebshopItemDetails, getObject, getObjectMetadata } from './AWS.js';
import parsers from './parsers.js';

const responses = {
  success: { success: true },
  missingDetails: { success: true, missingDetails: true }
};

// eslint-disable-next-line complexity
const handler = async (event) => {
  const key = decodeURIComponent(event.Records[0].s3.object.key);

  console.info(`Processing ${key}`);

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

  if (!details.originCountryId) {
    console.info(`No origin country found for ${key}, got details: ${JSON.stringify(details)}`);

    return responses.missingDetails;
  }

  if (!details.image) {
    console.info(`No image found for ${key}, got details: ${JSON.stringify(details)}`);

    return responses.missingDetails;
  }

  if (!details.varietyIds?.length && !details.tasteNoteIds?.length) {
    console.info(
      `No varieties or taste notes found for ${key}, got details: ${JSON.stringify(details)}, skipping storing`
    );

    return responses.missingDetails;
  }

  console.info(`Storing details for ${key}`);
  await addWebshopItemDetails({ url: key, details });

  return responses.success;
};

export { handler };
