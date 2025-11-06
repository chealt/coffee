// eslint-disable-next-line import/no-unresolved
import roasters from '../../data/roasters.json' with { type: 'json' };
import { invokeLambda } from '../AWS.js';
import { deflateSync } from 'node:zlib';

const main = async ({ roasterId }) => {
  console.info(`Recording webshop for ${roasterId}`);

  const roaster = roasters.find(({ id }) => id === roasterId);

  if (!roaster) {
    throw new Error(`Roaster: "${roasterId}" not found`);
  }

  const url = roaster.webshop;

  if (!url) {
    throw new Error(`Roaster: "${roasterId}" has no webshop`);
  }

  console.info(`Fetching webshop page ${url}`);

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch webshop page ${url}`);
  }

  const html = (await response.text()).match(/<body[^>]*>[\s\S]*<\/body>/giu)[0];

  console.info(`Invoke webshop processor for ${roasterId} and url: ${url}`);

  await invokeLambda({
    functionName: 'webshopProcessor',
    payload: { url, roasterId, html: deflateSync(html).toString('base64') }
  });
};

export default main;
