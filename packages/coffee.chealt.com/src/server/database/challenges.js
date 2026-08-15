/* eslint-disable camelcase */
import { getClient } from './client.js';

// Long enough for a user to work through an authenticator prompt, short enough that an
// abandoned ceremony stops being usable
const challengeTTL = 10 * 60 * 1000;

// Ceremonies are abandoned far more often than they are finished, so the rows are pruned
// on write instead of on a schedule. The cap only bites when a single user has an absurd
// number of ceremonies open at once.
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
        // the challenge just inserted is excluded so that a burst of ceremonies sharing a
        // created_at can never evict the one being handed out
        sql: 'DELETE FROM webauthn_challenges WHERE user_id = (:user_id) AND type = (:type) AND challenge != (:challenge) AND challenge NOT IN (SELECT challenge FROM webauthn_challenges WHERE user_id = (:user_id) AND type = (:type) ORDER BY created_at DESC LIMIT (:limit))',
        args: { user_id: user.id, type, challenge: options.challenge, limit: maxStoredChallenges }
      }
    ],
    'write'
  );
};

/**
 * Marks a challenge as used and returns the options it was handed out with, or undefined
 * when it is unknown, expired or already used. Claiming and reading are a single statement
 * so that two verifications of the same response cannot both proceed.
 */
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
