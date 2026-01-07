import logger from './Sentry/logger.js';
import sendNewCoffees from './coffees/new-coffees/index.js';

const defaultLocale = 'en';

export const handler = async ({ locale, notificationType }) => {
  switch (notificationType) {
    case 'newCoffeeNotification':
      await sendNewCoffees({ locale: locale || defaultLocale });

      break;
    default:
      logger.error(`Invalid notification type: ${notificationType}`);

      throw new Error(`Invalid notification type: ${notificationType}`);
  }

  logger.info(`Notification sent successfully for locale: ${locale} and notification type: ${notificationType}`);

  return { success: true };
};
