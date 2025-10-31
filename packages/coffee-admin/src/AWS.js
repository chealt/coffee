import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
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

export { getSecret, putObject };
