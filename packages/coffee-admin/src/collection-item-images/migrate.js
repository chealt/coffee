import { createClient } from '@libsql/client';
import { createClient as createPlatformClient } from '@tursodatabase/api';

import { putObject } from '../AWS.js';
import { getObject } from '../cloudflare.js';

const url = process.env.TURSO_DATABASE_URL;
const token = process.env.TURSO_API_TOKEN;

if (!url) {
  throw new Error('TURSO_DATABASE_URL is not set');
}

if (!token) {
  throw new Error('TURSO_API_TOKEN is not set');
}

const platformClient = createPlatformClient({
  org: 'chealt',
  token
});

const getImages = async (usernames) =>
  Promise.all(
    usernames.map(async (username) => {
      console.info(`creating user DB token for ${username}`);
      const { jwt: authToken } = await platformClient.databases.createToken(username, {
        authorization: 'full-access'
      });

      console.info(`creating DB client for ${username}`);
      const userClient = createClient({
        url: `libsql://${(await platformClient.databases.get(username)).hostname}`,
        authToken
      });

      const { rows: collectionItemImages } = await userClient.execute({
        sql: 'SELECT * FROM collection_item_images'
      });

      return collectionItemImages;
    })
  ).then((images) => images.flat().map(({ filename }) => filename));

const migrate = async () => {
  const images = await getImages(['attilabartha', 'roland', 'peter', 'barthamartyna']);

  await Promise.all(
    images.map(async (filename) => {
      const { ContentType, Body } = await getObject(filename);

      await putObject({ Bucket: 'centralbeans-coffee-images', ContentType, Body, Key: filename });
    })
  );
};

await migrate();
