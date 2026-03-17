import { TranslateClient, TranslateTextCommand } from '@aws-sdk/client-translate';

const translate = async ({ text: Text, from: SourceLanguageCode, to: TargetLanguageCode }) => {
  const config = {};
  const translationClient = new TranslateClient(config);
  const input = {
    Text,
    SourceLanguageCode,
    TargetLanguageCode
  };

  const command = new TranslateTextCommand(input);

  const { TranslatedText: translated } = await translationClient.send(command);

  return translated;
};

export { translate };
