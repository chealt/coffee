import jwt from 'jsonwebtoken';

import { sessionSecret, cookieNameSession } from './config.js';
import { parseCookie } from '../utils/request.js';

const getSessionJWT = ({ user }) =>
  jwt.sign({ userID: user.id, username: user.name }, sessionSecret, { expiresIn: '7d' });

const getSessionID = (request) => {
  const cookies = parseCookie(request);

  return cookies?.[cookieNameSession];
};

const verifySessionID = (sessionID) => jwt.verify(sessionID, sessionSecret);

const getSessionUser = (request) => {
  const sessionID = getSessionID(request);

  if (!sessionID) {
    throw new Error('Session ID not found');
  }

  const { userID, username } = verifySessionID(sessionID);

  return { userID, username };
};

export { getSessionJWT, getSessionUser };
