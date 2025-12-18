import { captureException } from '@sentry/cloudflare';

const logger = (() => {
  const debug = (message) => {
    console.debug(message);
  };

  const info = (message) => {
    console.info(message);
  };

  const log = (message) => {
    console.log(message);
  };

  const warn = (message) => {
    console.warn(message);
  };

  const error = (_error) => {
    console.error(_error);

    captureException(_error);
  };

  return {
    error,
    debug,
    info,
    log,
    warn
  };
})();

export default logger;
