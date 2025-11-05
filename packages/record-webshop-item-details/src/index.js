import { storeImage } from './AWS.js';
import { storeDetails } from './database.js';

const responses = {
  error: { success: false },
  success: { success: true },
  missingData: { success: false, missingData: true }
};

const handler = async (event) => {
  const isRemove = event.Records[0].eventName === 'REMOVE';

  if (!isRemove) {
    const url = event.Records[0].dynamodb.NewImage.url.S;
    const details = JSON.parse(event.Records[0].dynamodb.NewImage.details.S);

    console.info(`Recording webshop item ${url} with details ${JSON.stringify(event)}`);

    if (!url) {
      console.info(`Missing url in ${JSON.stringify(event)}`);

      return responses.missingData;
    }

    if (!details) {
      console.info(`Missing details in ${JSON.stringify(event)}`);

      return responses.missingData;
    }

    if (!details.image) {
      console.info(`Missing image in ${JSON.stringify(event)}`);

      return responses.missingData;
    }

    let filename;
    try {
      filename = await storeImage({ url: details.image });
    } catch (error) {
      console.error(`Error storing details for ${url}: ${error}`);

      return responses.error;
    }

    if (filename) {
      try {
        await storeDetails({ filename, details });
      } catch (error) {
        console.error(`Error storing details for ${url}: ${error}`);

        return responses.error;
      }
    }
  }

  return responses.success;
};

export { handler };
