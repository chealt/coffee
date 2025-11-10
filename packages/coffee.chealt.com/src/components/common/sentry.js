import * as Sentry from '@sentry/astro';

const init = () => {
  let sentry;

  try {
    sentry = Sentry.init({
      dsn: 'https://c03ded959e579ac5f500b11c23ad7b1c@o4510340291821568.ingest.de.sentry.io/4510340393140304',
      // Adds request headers and IP for users, for more info visit:
      // https://docs.sentry.io/platforms/javascript/guides/astro/configuration/options/#sendDefaultPii
      sendDefaultPii: true
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Sentry initialization failed', error);
  }

  return sentry;
};

init();
