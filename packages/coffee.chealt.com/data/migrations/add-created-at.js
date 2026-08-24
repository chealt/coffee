// TODO: add type
/* oxlint-disable no-console */
const migrate = async (client) => {
  const result = await client.execute("PRAGMA table_info('collections')");
  const columnExists = result.rows.some((row) => row.name === 'created_at');

  if (!columnExists) {
    console.info('Adding column created_at');

    await client.execute('ALTER TABLE collections ADD COLUMN created_at TEXT');

    console.info('Column added');
  } else {
    console.info('Column already exists, skipping');
  }

  const result2 = await client.execute("PRAGMA table_info('collection_items')");
  const columnExists2 = result2.rows.some((row) => row.name === 'created_at');

  if (!columnExists2) {
    console.info('Adding column created_at');

    await client.execute('ALTER TABLE collection_items ADD COLUMN created_at TEXT');

    console.info('Column added');
  } else {
    console.info('Column already exists, skipping');
  }

  const result3 = await client.execute("PRAGMA table_info('collection_item_links')");
  const columnExists3 = result3.rows.some((row) => row.name === 'created_at');

  if (!columnExists3) {
    console.info('Adding column created_at');

    await client.execute('ALTER TABLE collection_item_links ADD COLUMN created_at TEXT');

    console.info('Column added');
  } else {
    console.info('Column already exists, skipping');
  }

  const result4 = await client.execute("PRAGMA table_info('collection_item_images')");
  const columnExists4 = result4.rows.some((row) => row.name === 'created_at');

  if (!columnExists4) {
    console.info('Adding column created_at');

    await client.execute('ALTER TABLE collection_item_images ADD COLUMN created_at TEXT');

    console.info('Column added');
  } else {
    console.info('Column already exists, skipping');
  }
};

export { migrate };
