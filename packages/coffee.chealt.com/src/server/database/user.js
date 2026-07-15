/* eslint-disable camelcase */
import { getClient } from './client.js';

const getUser = async (username) => {
  const client = getClient(username);

  const { rows } = await client.execute({
    sql: 'SELECT * FROM users WHERE name = (:username)',
    args: { username }
  });

  return rows[0];
};

const getUserByUsernameOrEmail = async (usernameOrEmail) => {
  const client = getClient();

  const { rows } = await client.execute({
    sql: 'SELECT * FROM users WHERE username = (:usernameOrEmail) OR email = (:usernameOrEmail)',
    args: { usernameOrEmail }
  });

  return rows[0];
};

const getPasskeys = async (user) => {
  const client = getClient(user.name);

  const { rows } = await client.execute({
    sql: 'SELECT * FROM passkeys WHERE user_id = (:id) ORDER BY id DESC',
    args: { id: user.id }
  });

  return rows;
};

const getRegistrationOptions = async (username) => {
  const client = getClient(username);

  const { rows } = await client.execute({
    sql: 'SELECT registration_options FROM users WHERE name = (:name)',
    args: { name: username }
  });

  return JSON.parse(rows[0].registration_options);
};

const recordRegistrationOptions = ({ user, options }) => {
  const client = getClient(user.name);

  return client.execute({
    sql: 'UPDATE users SET registration_options = (:options) WHERE id = (:id)',
    args: { id: user.id, options: JSON.stringify(options) }
  });
};

const recordAuthenticationOptions = ({ user, options }) => {
  const client = getClient(user.name);

  return client.execute({
    sql: 'UPDATE users SET authentication_options = (:options) WHERE id = (:id)',
    args: { id: user.id, options: JSON.stringify(options) }
  });
};

const storeRegistration = ({
  user,
  verification: {
    registrationInfo: { credential, credentialDeviceType, credentialBackedUp }
  },
  registrationOptions
}) => {
  const client = getClient(user.name);

  return client.execute({
    sql: 'INSERT INTO passkeys (user_id, web_authn_user_id, credential_id, public_key, counter, transports, device_type, backed_up) VALUES (:user_id, :web_authn_user_id, :credential_id, :public_key, :counter, :transports, :device_type, :backed_up)',
    args: {
      user_id: user.id,
      web_authn_user_id: registrationOptions.user.id,
      credential_id: credential.id,
      public_key: Buffer.from(credential.publicKey),
      counter: credential.counter,
      transports: credential.transports.join(','),
      device_type: credentialDeviceType,
      backed_up: credentialBackedUp
    }
  });
};

const getAuthenticationOptions = async (username) => {
  const client = getClient(username);

  const { rows } = await client.execute({
    sql: 'SELECT authentication_options FROM users WHERE name = (:name)',
    args: { name: username }
  });

  return JSON.parse(rows[0].authentication_options);
};

const getPasskey = async ({ username, credentialId }) => {
  const client = getClient(username);
  const user = await getUser(username);

  const { rows } = await client.execute({
    sql: 'SELECT * FROM passkeys WHERE user_id = (:id) AND credential_id = (:credential_id)',
    args: { id: user.id, credential_id: credentialId }
  });

  return rows[0];
};

const updatePasskeyCounter = ({ username, credentialID, newCounter }) => {
  const client = getClient(username);

  return client.execute({
    sql: 'UPDATE passkeys SET counter = (:new_counter) WHERE credential_id = (:credential_id)',
    args: { credential_id: credentialID, new_counter: newCounter }
  });
};

export {
  getUser,
  getUserByUsernameOrEmail,
  getPasskeys,
  getRegistrationOptions,
  recordRegistrationOptions,
  storeRegistration,
  recordAuthenticationOptions,
  getAuthenticationOptions,
  getPasskey,
  updatePasskeyCounter
};
