import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { GetObjectCommand, S3Client, HeadObjectCommand } from '@aws-sdk/client-s3';
import { TranslateClient, TranslateTextCommand } from '@aws-sdk/client-translate';

const client = new S3Client({
  region: 'eu-central-1'
});

const dynamoClient = new DynamoDBClient({
  region: 'eu-central-1'
});

const translationClient = new TranslateClient({
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

const translate = async ({ text: Text, from: SourceLanguageCode, to: TargetLanguageCode }) => {
  const input = {
    Text,
    SourceLanguageCode,
    TargetLanguageCode
  };

  const command = new TranslateTextCommand(input);

  const { TranslatedText: translated } = await translationClient.send(command);

  return translated;
};

export { addWebshopItemDetails, getObject, getObjectMetadata, translate };
