import { getSecret } from './src/AWS.js';
import logger from './src/Sentry/logger.js';
import recordRoasterWebshop from './src/coffees/record-roaster-webshop.js';

const supportedFunctions = {
  coffeesRecordRoasterWebshop: 'coffees:record-roaster-webshop'
};

export const handler = async (event) => {
  if (!event.function) {
    logger.error('No function specified');

    throw new Error('No function specified');
  }

  if (!Object.values(supportedFunctions).includes(event.function)) {
    logger.error(
      `Unsupported function: ${event.function}, please choose one of ${Object.values(supportedFunctions).join(', ')}`
    );

    throw new Error(
      `Unsupported function: ${event.function}, please choose one of ${Object.values(supportedFunctions).join(', ')}`
    );
  }

  const secrets = await getSecret({ name: 'coffeeAdmin' });

  process.env.TURSO_API_TOKEN = secrets.TURSO_API_TOKEN;
  process.env.TURSO_DATABASE_URL = secrets.TURSO_DATABASE_URL;
  process.env.TURSO_DEFAULT_TOKEN = secrets.TURSO_DEFAULT_TOKEN;
  process.env.SESSION_SECRET = secrets.SESSION_SECRET;

  switch (event.function) {
    case supportedFunctions.coffeesRecordRoasterWebshop:
      if (!event.roasterId) {
        logger.error('No roasterId specified');

        throw new Error('No roasterId specified');
      }

      await recordRoasterWebshop({ roasterId: event.roasterId });

      break;
    default:
      logger.error(
        `Unsupported function: ${event.function}, please choose one of ${Object.values(supportedFunctions).join(', ')}`
      );

      throw new Error(
        `Unsupported function: ${event.function}, please choose one of ${Object.values(supportedFunctions).join(', ')}`
      );
  }

  return { success: true };
};
