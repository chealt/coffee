import { getClient } from './client.js';

const insert = async ({ user, key, value }) => {
  const client = getClient(user.name);

  return await client.execute({
    sql: 'INSERT INTO form_data (key, value) VALUES (:key, :value) ON CONFLICT (key) DO UPDATE SET value = :value',
    args: { key, value: JSON.stringify(value) }
  });
};

const getValue = async ({ user, key }) => {
  const client = getClient(user.name);

  const results = await client.execute({
    sql: 'SELECT value FROM form_data WHERE key = :key',
    args: { key }
  });

  return results?.rows[0]?.value ? JSON.parse(results.rows[0].value) : undefined;
};

export { getValue, insert };
