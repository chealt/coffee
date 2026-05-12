import { createClient } from '@libsql/client';

import { getSecret } from './AWS/secrets.js';
import logger from './Sentry/logger.js';

const secrets = await getSecret({ name: 'imageTextInterpreter' });

const authToken = secrets.TURSO_DEFAULT_TOKEN;
const databaseUrl = secrets.TURSO_DATABASE_URL;

if (!databaseUrl) {
  logger.error('TURSO_DATABASE_URL is not set');

  throw new Error('TURSO_DATABASE_URL is not set');
}

if (!authToken) {
  logger.error('TURSO_DEFAULT_TOKEN is not set');

  throw new Error('TURSO_DEFAULT_TOKEN is not set');
}

const client = createClient({
  url: databaseUrl,
  authToken
});

const getBrewingMethod = async (texts) => {
  logger.info(`Reading brewing methods from DB`);
  const { rows: brewingMethods } = await client.execute({
    sql: 'SELECT * FROM brewing_methods_all'
  });

  return brewingMethods.find(({ name }) => texts.includes(name));
};

const getOriginCountry = async (texts) => {
  logger.info(`Reading origin countries from DB`);
  const { rows: originCountries } = await client.execute({
    sql: 'SELECT * FROM origin_countries_all'
  });

  return originCountries.find(({ name }) => texts.includes(name));
};

const getOriginRegion = async (texts) => {
  logger.info(`Reading origin regions from DB`);
  const { rows: originRegions } = await client.execute({
    sql: 'SELECT * FROM origin_regions_all'
  });

  return originRegions.find(({ name }) => texts.includes(name));
};

const getOriginFarm = async (texts) => {
  logger.info(`Reading origin farms from DB`);
  const { rows: originFarms } = await client.execute({
    sql: 'SELECT * FROM origin_farms'
  });

  return originFarms.find(({ name }) => texts.includes(name));
};

const getProcessingMethod = async (texts) => {
  logger.info(`Reading processing methods from DB`);
  const { rows: processingMethods } = await client.execute({
    sql: 'SELECT * FROM processing_methods_all'
  });

  return processingMethods.find(({ name }) => texts.includes(name));
};

const getRoaster = async (texts) => {
  logger.info(`Reading roasters from DB`);
  const { rows: roasters } = await client.execute({
    sql: 'SELECT * FROM roasters'
  });

  return roasters.find(({ name }) => texts.includes(name.toLowerCase()));
};

const getTasteNotes = async (texts) => {
  logger.info(`Reading taste notes from DB`);
  const { rows: tasteNotes } = await client.execute({
    sql: 'SELECT * FROM taste_notes_all'
  });

  return tasteNotes.filter(({ name }) => texts.includes(name));
};

const getVarieties = async (texts) => {
  logger.info(`Reading varieties from DB`);
  const { rows: varieties } = await client.execute({
    sql: 'SELECT * FROM varieties'
  });

  return varieties.filter(({ name }) => texts.includes(name.toLowerCase()));
};

const saveDetails = ({ filename, details }) => {
  logger.info(`Saving item details for ${filename}`);

  return client.execute({
    sql: 'INSERT INTO collection_item_details (filename, details, status) VALUES (:filename, :details, :status) ON CONFLICT (filename) DO UPDATE SET details = excluded.details, status = excluded.status',
    args: { filename, details: JSON.stringify(details), status: 'processed' }
  });
};

export {
  getBrewingMethod,
  getOriginCountry,
  getOriginFarm,
  getOriginRegion,
  getProcessingMethod,
  getRoaster,
  getTasteNotes,
  getVarieties,
  saveDetails
};
