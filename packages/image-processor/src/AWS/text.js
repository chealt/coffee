import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { TextractClient, DetectDocumentTextCommand } from '@aws-sdk/client-textract';

const client = new TextractClient({});
const lambdaClient = new LambdaClient({
  region: 'eu-central-1'
});

const invokeLambda = ({ functionName: FunctionName, payload }) =>
  lambdaClient.send(
    new InvokeCommand({
      FunctionName,
      InvocationType: 'Event',
      Payload: JSON.stringify(payload)
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
    console.info(`Calling text interpreter for ${filename}`);
    await invokeLambda({
      functionName: 'imageTextInterpreter',
      payload: { filename, texts }
    });
  }
};

export { extractText };
