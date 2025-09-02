/* eslint-disable no-console */
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';

import getContent from './email-content.js';

const sesClient = new SESv2Client({ region: process.env.AWS_REGION });

const createSendEmailParams = ({ to, username, registrationCode }) => ({
  FromEmailAddress: 'info@chealt.com',
  Destination: {
    ToAddresses: [to] // Recipient must also be verified in sandbox mode
  },
  Content: {
    Simple: {
      Subject: {
        Data: 'Registration email from coffee.chealt.com',
        Charset: 'UTF-8'
      },
      Body: {
        Html: {
          Data: getContent({ username, registrationCode }),
          Charset: 'UTF-8'
        }
      }
    }
  }
});

const sendEmail = async ({ to, username, registrationCode }) => {
  const sendEmailCommand = new SendEmailCommand(createSendEmailParams({ to, username, registrationCode }));

  try {
    const result = await sesClient.send(sendEmailCommand);

    console.log('✅ Email sent successfully! Message ID:', result.MessageId);

    return result;
  } catch (error) {
    console.error('❌ Failed to send email.', error);

    throw error;
  }
};

export { sendEmail };
