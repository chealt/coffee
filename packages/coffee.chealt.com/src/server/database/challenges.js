/* eslint-disable camelcase */
import { getClient } from './client.js';

const challengeTTL = 10 * 60 * 1000;
const maxStoredChallenges = 20;

const recordChallenge = ({ user, type, options }) => {
  const now = new Date();
  const createdAt = now.toISOString();
  const client = getClient(user.name);

  return client.batch(
    [
      {
        sql: 'INSERT INTO webauthn_challenges (challenge, user_id, type, options, created_at, expires_at) VALUES (:challenge, :user_id, :type, :options, :created_at, :expires_at)',
        args: {
          challenge: options.challenge,
          user_id: user.id,
          type,
          options: JSON.stringify(options),
          created_at: createdAt,
          expires_at: new Date(now.getTime() + challengeTTL).toISOString()
        }
      },
      {
        sql: 'DELETE FROM webauthn_challenges WHERE user_id = (:user_id) AND (expires_at <= (:now) OR consumed_at IS NOT NULL)',
        args: { user_id: user.id, now: createdAt }
      },
      {
        sql: 'DELETE FROM webauthn_challenges WHERE user_id = (:user_id) AND type = (:type) AND challenge != (:challenge) AND challenge NOT IN (SELECT challenge FROM webauthn_challenges WHERE user_id = (:user_id) AND type = (:type) ORDER BY created_at DESC LIMIT (:limit))',
        args: { user_id: user.id, type, challenge: options.challenge, limit: maxStoredChallenges }
      }
    ],
    'write'
  );
};

const claimChallenge = async ({ username, challenge, type }) => {
  const client = getClient(username);
  const now = new Date().toISOString();

  const { rows } = await client.execute({
    sql: 'UPDATE webauthn_challenges SET consumed_at = (:consumed_at) WHERE challenge = (:challenge) AND type = (:type) AND consumed_at IS NULL AND expires_at > (:now) RETURNING options',
    args: { challenge, type, consumed_at: now, now }
  });

  return rows[0] && JSON.parse(rows[0].options);
};

export { recordChallenge, claimChallenge };
