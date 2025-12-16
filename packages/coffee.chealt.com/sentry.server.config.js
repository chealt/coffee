import { init } from '@sentry/astro';

// eslint-disable-next-line no-console
console.info(`Initializing Sentry for env: ${import.meta.env.MODE}`);
init({
  dsn: 'https://c03ded959e579ac5f500b11c23ad7b1c@o4510340291821568.ingest.de.sentry.io/4510340393140304',
  sendDefaultPii: true,
  environment: import.meta.env.MODE
});
