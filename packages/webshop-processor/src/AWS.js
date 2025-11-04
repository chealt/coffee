import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';

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

const addWebshopItemUrl = async ({ url, roasterId }) =>
  dynamoClient.send(
    new PutItemCommand({
      TableName: 'webshop-item-urls',
      Item: {
        url: { S: url },
        roasterId: { N: String(roasterId) }
      }
    })
  );

export { addWebshopItemUrl, getObject };
