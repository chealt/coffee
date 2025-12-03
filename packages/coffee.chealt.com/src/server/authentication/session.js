import jwt from 'jsonwebtoken';

import { sessionSecret } from './config.js';
import { getSessionID } from './cookies.js';

const getSessionJWT = ({ user }) =>
  jwt.sign({ userID: user.id, username: user.name }, sessionSecret, { expiresIn: '7d' });

const verifySessionID = (sessionID) => jwt.verify(sessionID, sessionSecret);

const getSessionUser = (context) => {
  const sessionID = getSessionID(context);

  if (!sessionID) {
    throw new Error('Session ID not found');
  }

  const { userID, username } = verifySessionID(sessionID);

  return { userID, username };
};

export { getSessionJWT, getSessionUser };
