import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

import { region, accessKeyId, secretAccessKey } from './config.js';

const invoke = async ({ name, payload }) => {
  const client = new LambdaClient({
    region,
    accessKeyId,
    secretAccessKey
  });

  const command = new InvokeCommand({
    FunctionName: name,
    Payload: JSON.stringify(payload)
  });

  const { StatusCode: statusCode, Payload } = await client.send(command);

  if (statusCode !== 200) {
    throw new Error(`Lambda invocation failed with status code ${statusCode}`);
  }

  const responseText = new TextDecoder().decode(Payload);
  const response = JSON.parse(responseText);

  return response;
};

export { invoke };
