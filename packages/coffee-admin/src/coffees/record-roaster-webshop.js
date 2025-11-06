// eslint-disable-next-line import/no-unresolved
import roasters from '../../data/roasters.json' with { type: 'json' };
import { putObject } from '../AWS.js';

const saveHTML = ({ url, html }) =>
  putObject({
    Bucket: 'roaster-webshop',
    Key: url,
    Body: html,
    ContentType: 'text/html'
  });

const main = async ({ roasterId }) => {
  console.info(`Recording webshop for ${roasterId}`);

  const roaster = roasters.find(({ id }) => id === roasterId);

  if (!roaster) {
    throw new Error(`Roaster: "${roasterId}" not found`);
  }

  if (!roaster.webshop) {
    throw new Error(`Roaster: "${roasterId}" has no webshop`);
  }

  console.info(`Fetching webshop page ${roaster.webshop}`);

  const response = await fetch(roaster.webshop);

  if (!response.ok) {
    throw new Error(`Failed to fetch webshop page ${roaster.webshop}`);
  }

  const html = (await response.text()).match(/<body[^>]*>[\s\S]*<\/body>/giu)[0];

  console.info(`Recording webshop page for ${roasterId}`);

  await saveHTML({ url: roaster.webshop, html });
};

export default main;
