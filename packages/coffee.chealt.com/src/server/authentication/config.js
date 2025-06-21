const relyingPartyName = 'Chealt Coffee';
const relyingPartyID = import.meta.env?.RELYING_PARTY_ID;
const origin = import.meta.env?.ORIGIN;
const sessionSecret = import.meta.env?.SESSION_SECRET || process.env.SESSION_SECRET;
const cookieNameUsername = 'coffee-chealt-username';
const cookieNameSession = 'coffee-chealt-session';

export { relyingPartyName, relyingPartyID, origin, cookieNameUsername, cookieNameSession, sessionSecret };
