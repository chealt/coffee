import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const getSecret = async ({ name }) => {
  const client = new SecretsManagerClient({
    region: 'eu-central-1'
  });

  const response = await client.send(
    new GetSecretValueCommand({
      SecretId: name
    })
  );

  return JSON.parse(response.SecretString);
};

export { getSecret };
