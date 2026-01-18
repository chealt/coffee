import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { TextractClient, DetectDocumentTextCommand } from '@aws-sdk/client-textract';

import logger from '../Sentry/logger.js';

const client = new TextractClient({});
const lambdaClient = new LambdaClient({
  region: 'eu-central-1'
});

const invokeLambda = ({ functionName: FunctionName, payload }) =>
  lambdaClient.send(
    new InvokeCommand({
      FunctionName,
      InvocationType: 'Event',
      Payload: JSON.stringify(payload)
    })
  );

const extractText = async ({ filename }) => {
  const input = {
    Document: {
      S3Object: {
        Bucket: 'centralbeans-coffee-images',
        Name: filename
      }
    }
  };
  const command = new DetectDocumentTextCommand(input);

  logger.info(`Extracting text from ${filename}`);
  const { Blocks } = await client.send(command);
  const texts = Blocks.filter(({ Confidence }) => Confidence > 90).map(({ Text: text }) => text);

  if (texts.length) {
    logger.info(`Extracted texts: ${texts.join(', ')} from ${filename}`);
  }

  if (texts.length) {
    logger.info(`Calling text interpreter for ${filename}`);
    await invokeLambda({
      functionName: 'imageTextInterpreter',
      payload: { filename, texts }
    });
  }
};

export { extractText };
