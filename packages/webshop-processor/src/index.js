import parsers from './parsers.js';
import { getRoaster } from './roasters.js';
import { getObject } from './s3.js';

const handler = async (event) => {
  const { key } = event.Records[0].s3.object;

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

  const productLinks = await parser(webshopHTML);

  if (productLinks?.length) {
    await Promise.all(
      productLinks.map((productLink) => {
        console.info(productLink);

        return 1;
      })
    );
  }

  return { success: true };
};

export { handler };
