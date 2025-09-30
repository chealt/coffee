import { cookieNameSession, cookieNameUsername } from './config.js';
import { parseCookie } from '../utils/request.js';

const getSessionID = (request) => {
  const cookies = parseCookie(request);

  return cookies?.[cookieNameSession];
};

const getUsername = (request) => {
  const cookies = parseCookie(request);

  return cookies?.[cookieNameUsername];
};

export { getSessionID, getUsername };
