import { convertImage } from './AWS/image.js';
import { extractText } from './AWS/text.js';

const handler = async (event) => {
  const { key: filename } = event.Records[0].s3.object;

  await Promise.all([convertImage({ filename }), extractText({ filename })]);

  return { success: true };
};

export { handler };
