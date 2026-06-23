import { SignJWT, jwtVerify } from 'jose';

import { sessionSecret } from './config.js';
import { getSessionID } from './cookies.js';

const secretKey = new TextEncoder().encode(sessionSecret);

const getSessionJWT = ({ user }) =>
  new SignJWT({ userID: user.id, username: user.name })
    .setProtectedHeader({ alg: 'HS256' }) // Explicitly state the hashing algorithm
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secretKey);

const verifySessionID = async (sessionID) => {
  const { payload } = await jwtVerify(sessionID, secretKey);

  return payload;
};

const getSessionUser = async (context) => {
  const sessionID = getSessionID(context);

  if (!sessionID) {
    throw new Error('Session ID not found');
  }

  const { userID, username } = await verifySessionID(sessionID);

  return { userID, username };
};

export { getSessionJWT, getSessionUser };
