import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

import { region, accessKeyId, secretAccessKey } from './config.js';
import logger from '../utils/logger.js';

const invoke = async ({ name, payload }) => {
  logger.info('Creating Lambda client');
  const client = new LambdaClient({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey
    }
  });

  logger.info('Creating Lambda invoke command');
  const command = new InvokeCommand({
    FunctionName: name,
    Payload: JSON.stringify(payload)
  });

  logger.info('Invoking lambda');
  const { StatusCode: statusCode, Payload } = await client.send(command);

  if (statusCode !== 200) {
    logger.error(`Lambda invocation failed with status code ${statusCode}`);

    throw new Error(`Lambda invocation failed with status code ${statusCode}`);
  }

  const responseText = new TextDecoder().decode(Payload);
  const response = JSON.parse(responseText);

  return response;
};

export { invoke };
