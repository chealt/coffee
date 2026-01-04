import { document, body } from '@centralbeans/email';

const content = ({ title, username, registrationCode, locale }) => `
  ${document({
    title,
    body: body({
      title,
      content: `
        <p>Register on Central Beans by following <a href="https://centralbeans.com/registration/${username}?code=${registrationCode}">this link</a>.</p>
        <p><b>Make sure to open the link in a browser, and NOT in the email app, otherwise the registration will fail.</b></p>
        <p>This link will work for the next 24 hours. Contact support at <a href="mailto:info@centralbeans.com">info@centralbeans.com</a> to receive a new registration link.</p>
      `,
      locale
    })
  })}
`;

export default content;
