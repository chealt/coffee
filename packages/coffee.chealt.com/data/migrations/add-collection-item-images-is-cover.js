// TODO: add type
/* oxlint-disable no-console */
const migrate = async (client) => {
  const result = await client.execute("PRAGMA table_info('collection_item_images')");
  const columnExists = result.rows.some((row) => row.name === 'is_cover');

  if (!columnExists) {
    console.info('Adding column is_cover');

    await client.execute('ALTER TABLE collection_item_images ADD COLUMN is_cover BOOLEAN');

    console.info('Column added');
  } else {
    console.info('Column already exists, skipping');
  }
};

export { migrate };
