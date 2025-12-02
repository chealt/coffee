import { getDetails } from '../coffees/utils.js';
import { titleCase } from '../utils.js';

const content = ({ newCoffees, localeContent, locale }) => `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${localeContent.newCoffeesEmailTitle}</title>
  <style type="text/css">
    body { margin: 0; padding: 0; min-width: 100%; font-family: Arial, sans-serif; font-size: 16px; line-height: 1.5; color: #333333; background-color: #f4f4f4; }
    a { color: #007bff; text-decoration: none; }
    img { display: block; max-width: 100%; height: auto; border: 0; }
    .wrapper { width: 100%; table-layout: fixed; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; background-color: #f4f4f4; }
    .main-table { margin: 0 auto; width: 100%; max-width: 600px; border-spacing: 0; font-family: sans-serif; color: #333333; background-color: #ffffff; border-radius: 8px; overflow: hidden; }
    .button { display: inline-block; padding: 10px 20px; background-color: #007bff; color: #ffffff; border-radius: 4px; text-decoration: none; font-weight: bold; }
  </style>
</head>
<body style="margin: 0; padding: 0; min-width: 100%; font-family: Arial, sans-serif; font-size: 16px; line-height: 1.5; color: #333333; background-color: #f4f4f4;">
  <div class="wrapper" style="width: 100%; table-layout: fixed; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; background-color: #f4f4f4; padding: 20px 0;">
    <table class="main-table" role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 0 auto; width: 100%; max-width: 600px; border-spacing: 0; font-family: sans-serif; color: #333333; background-color: #ffffff; border-radius: 8px; overflow: hidden;">
      <tr>
        <td class="header" style="padding: 20px; text-align: center; background-color: #222222; color: #ffffff;">
          <h1 style="margin: 0; font-size: 24px;">${localeContent.newCoffeesEmailTitle}</h1>
        </td>
      </tr>
      <tr>
        <td class="content" style="padding: 20px;">
          ${newCoffees
            .map(getDetails({ locale }))
            .map(
              ({
                images,
                roaster: { name: roasterName },
                originCountry: { name: originCountryName },
                varieties,
                brewingMethod,
                processingMethod,
                webshopItemLink,
                tasteNotes
              }) => `
            <table class="coffee-item" role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-bottom: 1px solid #eeeeee; margin-bottom: 20px;">
              <tr>
                <td align="center" style="padding-bottom: 15px;">
                  <img src="https://coffee-images.centralbeans.com/${images[0]}" alt="Coffee Image" width="300" style="display: block; max-width: 100%; height: auto; border: 0; border-radius: 8px;" />
                </td>
              </tr>
              <tr>
                <td align="center" style="padding-bottom: 10px;">
                  <h2 style="margin: 0; font-size: 20px;">${roasterName} - ${titleCase(originCountryName)}</h2>
                  <p style="margin: 5px 0; color: #666666;">${titleCase(originCountryName)} - ${varieties?.map((variety) => titleCase(variety.name)).join(', ')} - ${tasteNotes?.map((note) => titleCase(note.name)).join(', ')} - ${titleCase(brewingMethod?.name)} - ${titleCase(processingMethod?.name)}</p>
                </td>
              </tr>
              <tr>
                <td align="center" style="padding-bottom: 20px;">
                  <a href="${webshopItemLink}" class="button" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: #ffffff; border-radius: 4px; text-decoration: none; font-weight: bold;">Check it out</a>
                </td>
              </tr>
            </table>
          `
            )
            .join('')}
        </td>
      </tr>
      <tr>
        <td class="footer" style="padding: 20px; text-align: center; font-size: 12px; color: #999999; background-color: #f4f4f4;">
          <p style="margin: 0;">&copy; ${new Date().getFullYear()} Central Beans. All rights reserved.</p>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>
`;

export default content;
