import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const s3 = new S3Client({
  region: 'eu-central-1'
});

const lambdaClient = new LambdaClient({
  region: 'eu-central-1'
});

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
      Payload: JSON.stringify(payload)
    })
  );

export { getSecret, invokeLambda, putObject };
