// TODO: add type
/* oxlint-disable no-console */
const migrate = async (client) => {
  const result = await client.execute("PRAGMA table_info('collection_items')");
  const columnExists = result.rows.some((row) => row.name === 'deleted_at');

  if (!columnExists) {
    console.info('Adding column deleted_at');

    await client.execute('ALTER TABLE collection_items ADD COLUMN deleted_at TEXT');

    console.info('Column added');
  } else {
    console.info('Column already exists, skipping');
  }
};

export { migrate };
