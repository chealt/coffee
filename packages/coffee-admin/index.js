import { getSecret } from './src/AWS.js';
import importCurrencies from './src/currencies/import.js';
import sendRegistrationCode from './src/users/send-registration-code.js';

const supportedFunctions = ['currencies:import', 'users:send-registration-code'];

export const handler = async (event) => {
  if (!event.function) {
    throw new Error('No function specified');
  }

  if (!supportedFunctions.includes(event.function)) {
    throw new Error(`Unsupported function: ${event.function}, please choose one of ${supportedFunctions.join(', ')}`);
  }

  const secrets = await getSecret({ name: 'coffeeAdmin' });

  process.env.OPEN_CURRENCY_EXCHANGE_APP_ID = secrets.OPEN_CURRENCY_EXCHANGE_APP_ID;
  process.env.TURSO_API_TOKEN = secrets.TURSO_API_TOKEN;
  process.env.TURSO_DATABASE_URL = secrets.TURSO_DATABASE_URL;
  process.env.TURSO_DEFAULT_TOKEN = secrets.TURSO_DEFAULT_TOKEN;
  process.env.SESSION_SECRET = secrets.SESSION_SECRET;

  switch (event.function) {
    case 'currencies:import':
      await importCurrencies();

      break;
    case 'users:send-registration-code':
      const username = event.username;
      const email = event.email;

      await sendRegistrationCode({ username, email });

      break;
    default:
      throw new Error(`Unsupported function: ${event.function}, please choose one of ${supportedFunctions.join(', ')}`);
  }

  return { success: true };
};
