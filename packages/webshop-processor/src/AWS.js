import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';

const client = new S3Client({
  region: 'eu-central-1'
});

const lambdaClient = new LambdaClient({
  region: 'eu-central-1'
});

const getObject = async ({ bucketName, key }) => {
  const response = await client.send(
    new GetObjectCommand({
      Bucket: bucketName,
      Key: key
    })
  );

  return response.Body.transformToString();
};

const callRecordWebshopItem = ({ url, roasterId }) =>
  lambdaClient.send(
    new InvokeCommand({
      FunctionName: 'recordWebshopItem',
      Payload: JSON.stringify({
        url,
        roasterId
      })
    })
  );

export { callRecordWebshopItem, getObject };
