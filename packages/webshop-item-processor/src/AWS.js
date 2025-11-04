import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { GetObjectCommand, S3Client, HeadObjectCommand } from '@aws-sdk/client-s3';

const client = new S3Client({
  region: 'eu-central-1'
});

const dynamoClient = new DynamoDBClient({
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

const getObjectMetadata = async ({ bucketName: Bucket, key: Key }) => {
  const response = await client.send(new HeadObjectCommand({ Bucket, Key }));

  return response.Metadata;
};

const addWebshopItemDetails = async ({ url, details }) =>
  dynamoClient.send(
    new PutItemCommand({
      TableName: 'webshop-item-details',
      Item: {
        url: { S: url },
        details: { S: JSON.stringify(details) }
      }
    })
  );

export { addWebshopItemDetails, getObject, getObjectMetadata };
