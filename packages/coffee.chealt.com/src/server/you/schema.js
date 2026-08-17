import { getClient } from '../database/client.js';
import { getData } from '../database/data.js';
import { getSchema } from '../database/schema.js';

const setDatabaseData = async ({ tableName }) => {
  const client = await getClient();

  const schema = await getSchema({ client, tableName });
  const hasIDColumn = Object.values(schema)
    .map(({ name }) => name)
    .includes('name');
  const hasNameColumn = Object.values(schema)
    .map(({ name }) => name)
    .includes('name');
  const firstColumnName = Object.values(schema).map(({ name }) => name)[0];
  const sortBy = (hasNameColumn && 'name') || (hasIDColumn && 'id') || firstColumnName;
  const data = await getData({ client, tableName, sortBy });

  return { schema, data };
};

export { setDatabaseData };
