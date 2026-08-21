// TODO: add type
/* oxlint-disable no-console */
const migrate = async (client) => {
  const result = await client.execute("PRAGMA table_info('collections')");
  const columnExists = result.rows.some((row) => row.name === 'deleted_at');

  if (!columnExists) {
    console.info('Adding column deleted_at');

    await client.execute('ALTER TABLE collections ADD COLUMN deleted_at TEXT');

    console.info('Column added');
  } else {
    console.info('Column already exists, skipping');
  }
};

export { migrate };
