import { putObject } from './AWS.js';
// eslint-disable-next-line import/no-unresolved
import roasters from '../data/roasters.json' with { type: 'json' };

const saveHTML = ({ url, html, roasterId }) =>
  putObject({
    Bucket: 'roaster-webshop-item',
    Key: url,
    Body: html,
    ContentType: 'text/html',
    Metadata: {
      roasterId
    }
  });

const handler = async (event) => {
  const isRemove = event.Records[0].eventName === 'REMOVE';

  if (isRemove) {
    console.info('Remove event, skipping processing');

    return { success: true };
  }

  const url = event.Records[0].dynamodb.NewImage.url.S;
  const roasterId = Number(event.Records[0].dynamodb.NewImage.roasterId.N);

  if (!roasterId) {
    throw new Error(`roasterId is missing from the event`);
  }

  if (!url) {
    throw new Error(`url is missing from the event`);
  }

  console.info(`Recording webshop for ${roasterId}`);

  const roaster = roasters.find(({ id }) => id === roasterId);

  if (!roaster) {
    throw new Error(`Roaster: "${roasterId}" not found`);
  }

  console.info(`Fetching webshop item page ${url}`);

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch webshop item page ${url}`);
  }

  const html = await response.text();

  console.info(`Recording webshop item page for "${url}" and roaster id: ${roasterId}`);

  await saveHTML({ url, html, roasterId });

  return { success: true };
};

export { handler };
