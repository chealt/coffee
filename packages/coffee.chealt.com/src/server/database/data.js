const getData = async ({ client, tableName, sortBy }) => {
  const results = await client.execute({
    sql: `SELECT * FROM ${tableName} ORDER BY ${sortBy} COLLATE nocase ASC`
  });

  return results.rows;
};

export { getData };
