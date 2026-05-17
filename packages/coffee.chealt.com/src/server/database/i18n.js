import { getClient } from './client.js';

const getAll = async (locale) => {
  const client = getClient();

  const { rows } = await client.execute({
    sql: 'SELECT namespace, key, value FROM i18n WHERE locale = :locale',
    args: { locale }
  });

  return rows;
};

const save = async ({ namespace, key, value, locale }) => {
  const client = getClient();

  return await client.execute({
    sql: 'INSERT INTO i18n (namespace, key, value, locale) VALUES (:namespace, :key, :value, :locale) ON CONFLICT (namespace, key, locale) DO UPDATE SET value = :value',
    args: { namespace, key, value, locale }
  });
};

export { getAll, save };
