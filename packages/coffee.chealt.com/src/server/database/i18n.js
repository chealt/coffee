import { getClient } from './client.js';

const save = async ({ namespace, key, value, locale }) => {
  const client = getClient();

  return await client.execute({
    sql: 'INSERT INTO i18n (namespace, key, value, locale) VALUES (:namespace, :key, :value, :locale) ON CONFLICT (namespace, key, locale) DO UPDATE SET value = :value',
    args: { namespace, key, value, locale }
  });
};

export { save };
