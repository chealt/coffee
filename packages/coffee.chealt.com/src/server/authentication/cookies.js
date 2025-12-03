import { cookieNameSession, cookieNameUsername } from './config.js';

const getSessionID = (context) => context.cookies.get(cookieNameSession)?.value;
const getUsername = (context) => context.cookies.get(cookieNameUsername)?.value;

export { getSessionID, getUsername };
