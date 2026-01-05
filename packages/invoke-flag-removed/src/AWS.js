import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const secretsClient = new SecretsManagerClient();

const getSecret = async ({ name }) => {
  const response = await secretsClient.send(
    new GetSecretValueCommand({
      SecretId: name
    })
  );

  return JSON.parse(response.SecretString);
};

const lambdaClient = new LambdaClient();

const invokeLambda = ({ functionName: FunctionName, payload }) =>
  lambdaClient.send(
    new InvokeCommand({
      FunctionName,
      InvocationType: 'Event',
      Payload: JSON.stringify(payload)
    })
  );

export { getSecret, invokeLambda };
