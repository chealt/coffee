import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';

const lambdaClient = new LambdaClient();

const invokeLambda = ({ functionName: FunctionName, payload }) =>
  lambdaClient.send(
    new InvokeCommand({
      FunctionName,
      InvocationType: 'Event',
      Payload: JSON.stringify(payload)
    })
  );

export { invokeLambda };
