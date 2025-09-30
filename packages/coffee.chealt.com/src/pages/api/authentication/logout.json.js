import { cookieNameSession } from '../../../server/authentication/config.js';

const GET = () =>
  new Response(JSON.stringify({ redirectUrl: '/' }), {
    status: 200,
    headers: [
      ['Content-Type', 'application/json'],
      [
        'Set-Cookie',
        `${cookieNameSession}=; Path=/; HttpOnly; Secure; SameSite=Strict; expires=Thu, 01 Jan 1970 00:00:00 GMT`
      ]
    ]
  });

export { GET };
