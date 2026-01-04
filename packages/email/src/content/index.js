import locales from './locales.json' with { type: 'json' };

const localeContent = (locale) => {
  const content = locales[locale] || locales.en;

  return content;
};

const document = ({ title, body, locale }) => `
  <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
  <html xmlns="http://www.w3.org/1999/xhtml" lang="${locale || 'en'}">
    <head>
      <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
      <title>${title}</title>
      <style type="text/css">
        body { margin: 0; padding: 0; min-width: 100%; font-family: Arial, sans-serif; font-size: 16px; line-height: 1.5; color: #37352c; background-color: #ffffff; }
        a { color: #f8b64d; text-decoration: none; }
        img { display: block; max-width: 100%; height: auto; border: 0; }
        .wrapper { width: 100%; table-layout: fixed; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; background-color: #d4d4d4; }
        .main-table { margin: 0 auto; width: 100%; max-width: 600px; border-spacing: 0; font-family: sans-serif; color: #37352c; background-color: #f1e3cd; border-radius: 8px; overflow: hidden; }
        .button { display: inline-block; padding: 10px 20px; background-color: #f8b64d; color: #37352c; border-radius: 4px; text-decoration: none; font-weight: bold; }
      </style>
    </head>
    ${body}
  </html>
`;

const unsubscribeLink = ({ locale, notificationType }) =>
  `<a href="https://centralbeans.com/you/unsubscribe/${notificationType}">${localeContent(locale).unsubscribe}</a>`;

const body = ({ title, content, notificationType, locale }) => `
  <body style="margin: 0; padding: 0; min-width: 100%; font-family: Arial, sans-serif; font-size: 16px; line-height: 1.5; color: #37352c; background-color: #ffffff;">
    <div class="wrapper" style="width: 100%; table-layout: fixed; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; background-color: #ffffff; padding: 20px 0;">
      <table class="main-table" role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 0 auto; width: 100%; max-width: 600px; border-spacing: 0; font-family: sans-serif; color: #333333; background-color: #f1e3cd; border-radius: 8px; overflow: hidden;">
        <tr>
          <td class="header" style="padding: 20px; text-align: center; background-color: #37352c; color: #f1e3cd;">
            <h1 style="margin: 0; font-size: 24px;">${title}</h1>
          </td>
        </tr>
        <tr>
          <td class="content" style="padding: 20px;">
            ${content}
          </td>
        </tr>
        <tr>
          <td class="footer" style="padding: 20px; text-align: center; font-size: 12px; color: #37352c; background-color: rgba(250, 250, 250, 0.4);">
            <p style="margin: 0;">&copy; ${new Date().getFullYear()} Central Beans. ${localeContent(locale).allRightsReserved}.</p>
            ${notificationType ? `<p style="margin: 5px 0;">${unsubscribeLink({ locale, notificationType })}</p>` : ''}
          </td>
        </tr>
      </table>
    </div>
  </body>
`;

export { document, body };
