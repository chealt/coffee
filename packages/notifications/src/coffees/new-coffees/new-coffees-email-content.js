/* eslint-disable complexity */
import { document, body } from '@centralbeans/email';

import { titleCase } from '../../string.js';
import { getDetails } from '../utils.js';

const content = ({ newCoffees, locale, title }) => `
  ${document({
    title,
    body: body({
      title,
      content: `
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
                    <img src="https://centralbeans.com/images/600/${images[0]}" alt="Coffee Image" width="300" style="display: block; max-width: 100%; height: auto; border: 0; border-radius: 8px;" />
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-bottom: 10px;">
                    <h2 style="margin: 0; font-size: 20px;">${roasterName} - ${titleCase(originCountryName)}</h2>
                    ${brewingMethod?.name ? `<p style="margin: 5px 0; color: #666666;">${titleCase(brewingMethod.name)}</p>` : ''}
                    ${processingMethod?.name ? `<p style="margin: 5px 0; color: #666666;">${titleCase(processingMethod.name)}</p>` : ''}
                    ${varieties?.length ? `<p style="margin: 5px 0; color: #666666;">${varieties?.map(({ name }) => titleCase(name)).join(', ')}</p>` : ''}
                    ${tasteNotes?.length ? `<p style="margin: 5px 0; color: #666666;">${tasteNotes?.map(({ name }) => titleCase(name)).join(', ')}</p>` : ''}
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding-bottom: 20px;">
                    <a href="${webshopItemLink}" class="button" style="display: inline-block; padding: 10px 20px; background-color: #f8b64d; color: #272727; border-radius: 4px; text-decoration: none; font-weight: bold;">Check it out</a>
                  </td>
                </tr>
              </table>
            `
          )
          .join('')}
      `,
      notificationType: 'newCoffeeNotification'
    })
  })}
`;

export default content;
