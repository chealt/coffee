import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

const lambdaClient = new LambdaClient({
  region: 'eu-central-1'
});

const callWebshopItemProcessor = ({ url, html, roasterId }) =>
  lambdaClient.send(
    new InvokeCommand({
      FunctionName: 'webshopItemProcessor',
      InvocationType: 'Event',
      Payload: JSON.stringify({
        url,
        html,
        roasterId
      })
    })
  );

export { callWebshopItemProcessor };
