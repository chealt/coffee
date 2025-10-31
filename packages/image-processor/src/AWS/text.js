import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { TextractClient, DetectDocumentTextCommand } from '@aws-sdk/client-textract';

const client = new TextractClient({});
const dynamoClient = new DynamoDBClient({});

const saveTexts = async ({ filename, texts }) =>
  dynamoClient.send(
    new PutItemCommand({
      TableName: 'collection-item-image-texts',
      Item: {
        filename: { S: filename },
        texts: { S: JSON.stringify(texts) }
      }
    })
  );

const extractText = async ({ filename }) => {
  const input = {
    Document: {
      S3Object: {
        Bucket: 'centralbeans-coffee-images',
        Name: filename
      }
    }
  };
  const command = new DetectDocumentTextCommand(input);

  console.info(`Extracting text from ${filename}`);
  const { Blocks } = await client.send(command);
  const texts = Blocks.filter(({ Confidence }) => Confidence > 90).map(({ Text: text }) => text);

  if (texts.length) {
    console.info(`Saving texts from ${filename}`);
    await saveTexts({ filename, texts });
  }
};

export { extractText };
