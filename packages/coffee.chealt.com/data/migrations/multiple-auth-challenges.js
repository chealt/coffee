// TODO: add type
/* oxlint-disable no-console */
const migrate = async (client) => {
  const result = await client.execute({
    sql: "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'webauthn_challenges'"
  });

  if (result.rows.length > 0) {
    console.info('Already migrated');

    return undefined;
  }

  console.info('updating tables');

  return await client.batch([
    { sql: 'ALTER TABLE users DROP COLUMN authentication_options' },
    { sql: 'ALTER TABLE users DROP COLUMN registration_options' },
    {
      sql: `CREATE TABLE webauthn_challenges (
        challenge text PRIMARY KEY NOT NULL,
        user_id integer NOT NULL,
        type text NOT NULL,
        options text NOT NULL,
        created_at text NOT NULL,
        expires_at text NOT NULL,
        consumed_at text,
        CONSTRAINT user_id_fk FOREIGN KEY (user_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE,
        CONSTRAINT "type" CHECK(type IN ('registration', 'authentication'))
      )`
    },
    { sql: 'CREATE INDEX `webauthn_challenges_expires_at` ON `webauthn_challenges` (`expires_at`)' },
    { sql: 'CREATE INDEX `webauthn_challenges_user_type` ON `webauthn_challenges` (`user_id`,`type`)' }
  ]);
};

export { migrate };
