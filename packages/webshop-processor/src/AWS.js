import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

const lambdaClient = new LambdaClient({
  region: 'eu-central-1'
});

const callRecordWebshopItem = ({ url, roasterId }) =>
  lambdaClient.send(
    new InvokeCommand({
      FunctionName: 'recordWebshopItem',
      InvocationType: 'Event',
      Payload: JSON.stringify({
        url,
        roasterId
      })
    })
  );

export { callRecordWebshopItem };
