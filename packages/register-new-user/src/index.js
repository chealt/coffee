import { sendEmail } from './AWS.js';
import logger from './Sentry/logger.js';
import content from './email-content.js';

export const handler = async ({ email }) => {
  if (!email) {
    logger.error('Email is not set');

    throw new Error('Email is not set');
  }

  await sendEmail({
    to: 'registration-request@centralbeans.com',
    content: content({
      title: 'Registration request',
      bodyContent: `Registration request for ${email}`,
      locale: 'en'
    }),
    subject: 'Registration request'
  });
};
