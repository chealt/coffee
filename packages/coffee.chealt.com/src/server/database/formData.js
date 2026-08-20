import logger from '../utils/logger.js';
import { getClient } from './client.js';

const insert = async ({ user, key, value }) => {
  const client = getClient(user.name);

  return await client.execute({
    sql: 'INSERT INTO form_data (key, value) VALUES (:key, :value) ON CONFLICT (key) DO UPDATE SET value = :value',
    args: { key, value: JSON.stringify(value) }
  });
};

const updateAttributeValue = async ({ user, key, attributes }) => {
  const oldValue = await getValue({ user, key });

  if (!oldValue) {
    logger.info(`Cannot find key: ${key}, for user: ${user.name}, creating it...`);

    await insert({ user, key, value: {} });
  }

  const client = getClient(user.name);
  const newValue = {
    ...oldValue,
    ...attributes
  };

  try {
    await client.execute({
      sql: 'UPDATE form_data SET value = :value WHERE key = :key',
      args: {
        key,
        value: JSON.stringify(newValue)
      }
    });
  } catch (error) {
    logger.error(`Cannot update attribute: ${JSON.stringify(attributes)} for key: ${key}`);

    throw error;
  }
};

const getValue = async ({ user, key }) => {
  const client = getClient(user.name);

  const results = await client.execute({
    sql: 'SELECT value FROM form_data WHERE key = :key',
    args: { key }
  });

  return results?.rows[0]?.value ? JSON.parse(results.rows[0].value) : undefined;
};

export { getValue, insert, updateAttributeValue };
