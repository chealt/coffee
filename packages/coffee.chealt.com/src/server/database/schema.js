const getSchema = async ({ client, tableName }) => {
  const results = await client.execute({
    sql: 'SELECT * FROM pragma_table_info(:tableName)',
    args: { tableName }
  });

  return results.rows?.map(({ dflt_value, name, type, notnull }) => ({
    default: dflt_value,
    isNullable: !notnull,
    name,
    type,
    isReadonly: name === 'id'
  }));
};

export { getSchema };
