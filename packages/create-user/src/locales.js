const data = {
  en: {
    registrationEmailSubject: '☕ Register at Central Beans 🫘',
    registrationEmailTitle: 'Register at Central Beans',
    content: ({ username, registrationCode }) => `
      <table class="content-item" role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-bottom: 1px solid #eeeeee; margin-bottom: 20px;">
        <tr>
          <td align="center" style="padding-bottom: 15px;">
            <p style="margin: 5px 0; color: #666666;">
              Register on Central Beans by following the link below.
            </p>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding-bottom: 20px;">
            <a href="https://centralbeans.com/registration/${username}?code=${registrationCode}" class="button" style="display: inline-block; padding: 10px 20px; background-color: #f8b64d; color: #272727; border-radius: 4px; text-decoration: none; font-weight: bold;">Complete Registration</a>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding-bottom: 10px;">
            <p style="margin: 5px 0; color: #272727; font-weight: bold;">
              Make sure to open the link in a browser, and NOT in the email app, otherwise the registration might fail.
            </p>
            <p style="margin: 5px 0; color: #666666; font-size: 14px;">
              This link will work for the next 24 hours. Contact support at
              <a href="mailto:info@centralbeans.com" style="color: #666666;">info@centralbeans.com</a> to receive a new registration link.
            </p>
          </td>
        </tr>
      </table>
      <table class="content-item" role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-bottom: 1px solid #eeeeee; margin-bottom: 20px;">
        <tr>
          <td align="center" style="padding-bottom: 15px;">
            <img src="https://centralbeans.com/screenshots/features/profile-page.png" alt="Profile page" width="300" style="display: block; max-width: 100%; height: auto; border: 0; border-radius: 8px;" />
          </td>
        </tr>
        <tr>
          <td align="center" style="padding-bottom: 10px;">
            <h2 style="margin: 0; font-size: 20px; margin-bottom: 10px;">Profile Page</h2>
            <p style="margin: 5px 0; color: #666666;">
              Update your settings on the <a href="https://centralbeans.com/you/profile" style="color: #f8b64d; text-decoration: none;">Profile page</a> like currency or language. You can access it by navigation to the <a href="https://centralbeans.com/you/collections" style="color: #f8b64d; text-decoration: none;">You page</a>, and clicking on the Icon in the top right corner.
            </p>
          </td>
        </tr>
      </table>
      <table class="content-item" role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-bottom: 1px solid #eeeeee; margin-bottom: 20px;">
        <tr>
          <td align="center" style="padding-bottom: 15px;">
            <img src="https://centralbeans.com/screenshots/features/lists.png" alt="Collections page" width="300" style="display: block; max-width: 100%; height: auto; border: 0; border-radius: 8px;" />
          </td>
        </tr>
        <tr>
          <td align="center" style="padding-bottom: 10px;">
            <h2 style="margin: 0; font-size: 20px; margin-bottom: 10px;">Collections</h2>
            <p style="margin: 5px 0; color: #666666;">
              Start collecting your coffees by adding them to your <a href="https://centralbeans.com/you/collections" style="color: #f8b64d; text-decoration: none;">collections</a>. We created a few collections for you to get started. Feel free to add your own.
            </p>
          </td>
        </tr>
      </table>
      <table class="content-item" role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-bottom: 1px solid #eeeeee; margin-bottom: 20px;">
        <tr>
          <td align="center" style="padding-bottom: 15px;">
            <img src="https://centralbeans.com/screenshots/features/details.png" alt="Coffee details page" width="300" style="display: block; max-width: 100%; height: auto; border: 0; border-radius: 8px;" />
          </td>
        </tr>
        <tr>
          <td align="center" style="padding-bottom: 10px;">
            <h2 style="margin: 0; font-size: 20px; margin-bottom: 10px;">Coffee Details</h2>
            <p style="margin: 5px 0; color: #666666;">
              Update the details of your coffees on their details page. You can add more pictures for the same coffee, and add details like origin, roast level, etc.
            </p>
          </td>
        </tr>
      </table>
      <table class="content-item" role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-bottom: 1px solid #eeeeee; margin-bottom: 20px;">
        <tr>
          <td align="center" style="padding-bottom: 15px;">
            <img src="https://centralbeans.com/screenshots/features/review.png" alt="Coffee review page" width="300" style="display: block; max-width: 100%; height: auto; border: 0; border-radius: 8px;" />
          </td>
        </tr>
        <tr>
          <td align="center" style="padding-bottom: 10px;">
            <h2 style="margin: 0; font-size: 20px; margin-bottom: 10px;">Personalized Recommendations</h2>
            <p style="margin: 5px 0; color: #666666;">
              Review your coffees on the details page to get personalized recommendations when browsing the shop.
            </p>
          </td>
        </tr>
      </table>
    `
  },
  pl: {
    registrationEmailSubject: '☕ Rejestruj się w Central Beans 🫘',
    registrationEmailTitle: 'Rejestruj się w Central Beans',
    content: ({ username, registrationCode }) => `
      <table class="content-item" role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-bottom: 1px solid #eeeeee; margin-bottom: 20px;">
        <tr>
          <td align="center" style="padding-bottom: 15px;">
            <p style="margin: 5px 0; color: #666666;">
              Zarejestruj się w Central Beans, klikając w link poniżej.
            </p>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding-bottom: 20px;">
            <a href="https://centralbeans.com/registration/${username}?code=${registrationCode}" class="button" style="display: inline-block; padding: 10px 20px; background-color: #f8b64d; color: #272727; border-radius: 4px; text-decoration: none; font-weight: bold;">Dokończ rejestrację</a>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding-bottom: 10px;">
            <p style="margin: 5px 0; color: #272727; font-weight: bold;">
              Pamiętaj, aby otworzyć link w przeglądarce, a NIE w aplikacji pocztowej, w przeciwnym razie rejestracja może się nie powieść.
            </p>
            <p style="margin: 5px 0; color: #666666; font-size: 14px;">
              Link jest ważny przez 24 godziny. Aby otrzymać nowy link rejestracyjny, skontaktuj się z nami pod adresem
              <a href="mailto:info@centralbeans.com" style="color: #666666;">info@centralbeans.com</a>.
            </p>
          </td>
        </tr>
      </table>
      <table class="content-item" role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-bottom: 1px solid #eeeeee; margin-bottom: 20px;">
        <tr>
          <td align="center" style="padding-bottom: 15px;">
            <img src="https://centralbeans.com/screenshots/features/profile-page.png" alt="Strona profilu" width="300" style="display: block; max-width: 100%; height: auto; border: 0; border-radius: 8px;" />
          </td>
        </tr>
        <tr>
          <td align="center" style="padding-bottom: 10px;">
            <h2 style="margin: 0; font-size: 20px; margin-bottom: 10px;">Strona Profilu</h2>
            <p style="margin: 5px 0; color: #666666;">
              Zaktualizuj swoje ustawienia, takie jak waluta czy język, na <a href="https://centralbeans.com/you/profile" style="color: #f8b64d; text-decoration: none;">stronie Profilu</a>. Możesz do niej przejść ze <a href="https://centralbeans.com/you/collections" style="color: #f8b64d; text-decoration: none;">strony Ty</a>, klikając ikonę w prawym górnym rogu.
            </p>
          </td>
        </tr>
      </table>
      <table class="content-item" role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-bottom: 1px solid #eeeeee; margin-bottom: 20px;">
        <tr>
          <td align="center" style="padding-bottom: 15px;">
            <img src="https://centralbeans.com/screenshots/features/lists.png" alt="Strona kolekcji" width="300" style="display: block; max-width: 100%; height: auto; border: 0; border-radius: 8px;" />
          </td>
        </tr>
        <tr>
          <td align="center" style="padding-bottom: 10px;">
            <h2 style="margin: 0; font-size: 20px; margin-bottom: 10px;">Kolekcje</h2>
            <p style="margin: 5px 0; color: #666666;">
              Zacznij kolekcjonować kawy, dodając je do swoich <a href="https://centralbeans.com/you/collections" style="color: #f8b64d; text-decoration: none;">kolekcji</a>. Na start przygotowaliśmy dla Ciebie kilka z nich. Śmiało twórz też własne.
            </p>
          </td>
        </tr>
      </table>
      <table class="content-item" role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-bottom: 1px solid #eeeeee; margin-bottom: 20px;">
        <tr>
          <td align="center" style="padding-bottom: 15px;">
            <img src="https://centralbeans.com/screenshots/features/details.png" alt="Strona szczegółów kawy" width="300" style="display: block; max-width: 100%; height: auto; border: 0; border-radius: 8px;" />
          </td>
        </tr>
        <tr>
          <td align="center" style="padding-bottom: 10px;">
            <h2 style="margin: 0; font-size: 20px; margin-bottom: 10px;">Szczegóły Kawy</h2>
            <p style="margin: 5px 0; color: #666666;">
              Uzupełniaj informacje o swoich kawach na ich stronach szczegółów. Możesz dodawać więcej zdjęć tej samej kawy oraz szczegóły takie jak pochodzenie, stopień wypalenia itp.
            </p>
          </td>
        </tr>
      </table>
      <table class="content-item" role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-bottom: 1px solid #eeeeee; margin-bottom: 20px;">
        <tr>
          <td align="center" style="padding-bottom: 15px;">
            <img src="https://centralbeans.com/screenshots/features/review.png" alt="Strona oceniania kawy" width="300" style="display: block; max-width: 100%; height: auto; border: 0; border-radius: 8px;" />
          </td>
        </tr>
        <tr>
          <td align="center" style="padding-bottom: 10px;">
            <h2 style="margin: 0; font-size: 20px; margin-bottom: 10px;">Spersonalizowane Rekomendacje</h2>
            <p style="margin: 5px 0; color: #666666;">
              Oceniaj swoje kawy na stronie szczegółów, aby otrzymywać spersonalizowane rekomendacje podczas przeglądania sklepu.
            </p>
          </td>
        </tr>
      </table>
    `
  }
};

const locales =
  ({ locale }) =>
  (path, params = {}) => {
    if (!data[locale]) {
      throw new Error(`Locale ${locale} not found`);
    } else if (!data[locale][path]) {
      throw new Error(`Locale path ${path} not found for locale ${locale}`);
    } else if (typeof data[locale][path] === 'function') {
      return data[locale][path](params);
    } else {
      return data[locale][path];
    }
  };

export default locales;
