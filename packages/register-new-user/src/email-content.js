import { document, body } from '@centralbeans/email';

const content = ({ title, bodyContent, locale }) => `
  ${document({
    title,
    body: body({
      title,
      content: bodyContent,
      locale
    })
  })}
`;

export default content;
