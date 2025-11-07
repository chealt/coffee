import { callRecordWebshopItemDetails } from './AWS.js';
import parsers from './parsers.js';
import { inflateSync } from 'node:zlib';

const responses = {
  success: { success: true },
  missingDetails: { success: true, missingDetails: true }
};

const handler = async (event) => {
  const { url, roasterId } = event;
  const html = inflateSync(Buffer.from(event.html, 'base64')).toString();

  console.info(`Processing ${url}`);

  if (!roasterId) {
    throw new Error(`No roaster id found for ${url}, got event ${JSON.stringify(event)}`);
  }

  if (!html) {
    throw new Error(`No webshop HTML found for ${url}`);
  }

  const parser = parsers[roasterId];

  if (!parser) {
    throw new Error(`No parser found for ${roasterId}`);
  }

  const details = await parser({ html, url, roasterId });

  if (!details.originCountryId) {
    console.info(`No origin country found for ${url}, got details: ${JSON.stringify(details)}`);

    return responses.missingDetails;
  }

  if (!details.image) {
    console.info(`No image found for ${url}, got details: ${JSON.stringify(details)}`);

    return responses.missingDetails;
  }

  if (!details.varietyIds?.length && !details.tasteNoteIds?.length) {
    console.info(
      `No varieties or taste notes found for ${url}, got details: ${JSON.stringify(details)}, skipping storing`
    );

    return responses.missingDetails;
  }

  console.info(`Calling record webshop item details for ${url}`);
  await callRecordWebshopItemDetails({ url, details });

  return responses.success;
};

export { handler };
