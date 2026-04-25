import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

const lambdaClient = new LambdaClient();

const invokeLambda = ({ functionName: FunctionName, payload }) =>
  lambdaClient.send(
    new InvokeCommand({
      FunctionName,
      InvocationType: 'Event',
      Payload: JSON.stringify(payload)
    })
  );

const client = new S3Client({
  region: 'eu-central-1'
});

const putObject = async ({ bucketName, key, data }) =>
  client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: data
    })
  );

export { invokeLambda, putObject };
