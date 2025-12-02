import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2';

const s3 = new S3Client({
  region: process.env.AWS_REGION
});

const lambdaClient = new LambdaClient({
  region: process.env.AWS_REGION
});

const sesClient = new SESv2Client({ region: process.env.AWS_REGION });

const client = new SecretsManagerClient({
  region: process.env.AWS_REGION
});

const getSecret = async ({ name }) => {
  const response = await client.send(
    new GetSecretValueCommand({
      SecretId: name
    })
  );

  return JSON.parse(response.SecretString);
};

const putObject = async ({ Bucket, Key, ContentType, Body }) =>
  s3.send(
    new PutObjectCommand({
      Bucket,
      ContentType,
      Key,
      Body
    })
  );

const invokeLambda = ({ functionName: FunctionName, payload }) =>
  lambdaClient.send(
    new InvokeCommand({
      FunctionName,
      InvocationType: 'Event',
      Payload: JSON.stringify(payload)
    })
  );

const createSendEmailParams = ({ to, content, subject, attachments = [] }) => {
  // If no attachments, use Simple format
  if (!attachments.length) {
    return {
      FromEmailAddress: 'info@centralbeans.com',
      Destination: {
        ToAddresses: [to]
      },
      Content: {
        Simple: {
          Subject: {
            Data: subject,
            Charset: 'UTF-8'
          },
          Body: {
            Html: {
              Data: content,
              Charset: 'UTF-8'
            }
          }
        }
      }
    };
  }

  // Build multipart email with inline attachments
  const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  let rawMessage = [
    `From: info@centralbeans.com`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/related; boundary="${boundary}"`,
    ``,
    `--${boundary}`,
    `Content-Type: text/html; charset=UTF-8`,
    `Content-Transfer-Encoding: 7bit`,
    ``,
    content,
    ``
  ];

  // Add inline attachments
  for (const { cid, content: imageContent, contentType } of attachments) {
    rawMessage.push(
      `--${boundary}`,
      `Content-Type: ${contentType}`,
      `Content-Transfer-Encoding: base64`,
      `Content-ID: <${cid}>`,
      `Content-Disposition: inline`,
      ``,
      imageContent,
      ``
    );
  }

  rawMessage.push(`--${boundary}--`);

  return {
    FromEmailAddress: 'info@centralbeans.com',
    Destination: {
      ToAddresses: [to]
    },
    Content: {
      Raw: {
        Data: Buffer.from(rawMessage.join('\r\n'))
      }
    }
  };
};

const sendEmail = async ({ to, content, subject, attachments }) => {
  const sendEmailCommand = new SendEmailCommand(createSendEmailParams({ to, content, subject, attachments }));

  try {
    const result = await sesClient.send(sendEmailCommand);

    console.log('✅ Email sent successfully! Message ID:', result.MessageId);

    return result;
  } catch (error) {
    console.error('❌ Failed to send email.', error);

    throw error;
  }
};

export { getSecret, invokeLambda, putObject, sendEmail };
