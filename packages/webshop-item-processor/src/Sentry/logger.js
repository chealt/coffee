import * as Sentry from '@sentry/aws-serverless';

const logger = {
  info: (message) => {
    console.info(message);
  },
  debug: (message) => {
    console.debug(message);
  },
  error: (message) => {
    Sentry.captureException(message);

    console.error(message);
  },
  warn: (message) => {
    Sentry.captureMessage(message, 'warning');

    console.warn(message);
  }
};

export default logger;
