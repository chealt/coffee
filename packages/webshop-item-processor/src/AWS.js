import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { TranslateClient, TranslateTextCommand } from '@aws-sdk/client-translate';

const lambdaClient = new LambdaClient({
  region: 'eu-central-1'
});

const translationClient = new TranslateClient({
  region: 'eu-central-1'
});

const callRecordWebshopItemDetails = async ({ url, details }) =>
  lambdaClient.send(
    new InvokeCommand({
      FunctionName: 'recordWebshopItemDetails',
      InvocationType: 'Event',
      Payload: JSON.stringify({
        url,
        details
      })
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

export { callRecordWebshopItemDetails, translate };
