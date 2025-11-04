import { storeImage } from './AWS.js';
import { storeDetails } from './database.js';

const handler = async (event) => {
  const isRemove = event.Records[0].eventName === 'REMOVE';

  if (!isRemove) {
    const url = event.Records[0].dynamodb.NewImage.url.S;
    const details = JSON.parse(event.Records[0].dynamodb.NewImage.details.S);

    if (!url) {
      throw new Error(`Missing url in ${JSON.stringify(event)}`);
    }

    if (!details) {
      throw new Error(`Missing details in ${JSON.stringify(event)}`);
    }

    if (!details.image) {
      throw new Error(`Missing image in ${JSON.stringify(event)}`);
    }

    const filename = await storeImage({ url: details.image });

    await storeDetails({ filename, details });
  }

  return { success: true };
};

export { handler };
