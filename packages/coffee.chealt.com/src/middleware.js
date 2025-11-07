import jwt from 'jsonwebtoken';

import supportedLanguages from '../data/supportedLanguages.json';
import { getImageUrl } from './server/AWS/storage.js';
import { sessionSecret } from './server/authentication/config.js';
import { getUsername } from './server/authentication/cookies.js';
import { getSessionUser } from './server/authentication/session.js';
import { cookieNameLocale, cookieNameCurrency, defaultCurrency } from './server/config.js';
import { getValue } from './server/database/formData.js';
import { getAuthenticationOptions } from './server/login.js';
import { createRegistrationOptions } from './server/registration.js';
import { setCollections, setCollectionItem } from './server/you/collections.js';
import { setRecommended } from './server/you/recommendations.js';

const locales = supportedLanguages.map(({ locale }) => locale);
const defaultLocale = supportedLanguages.find(({ isDefault }) => isDefault).locale;

const setGetSignedUrl = (context) => {
  context.locals.getSignedUrl = '/api/storage/get-signed-url.json';
};

const setImageUploadUrls = (context) => {
  context.locals.imageUploadUrls = {
    small: getImageUrl({ size: 'small' }),
    medium: getImageUrl({ size: 'medium' }),
    original: getImageUrl()
  };
};

const setCurrency = async (context) => {
  const cookieCurrency = context.cookies.get(cookieNameCurrency)?.value;
  let currencyDB;

  try {
    const settings = await getValue({ user: { name: getSessionUser(context.request)?.username }, key: 'settings' });

    currencyDB = settings?.currency;
  } catch {
    // eslint-disable-next-line no-console
    console.info('Not logged in, so could not read currency from DB.');
  }

  const currency = currencyDB || cookieCurrency || defaultCurrency;

  context.locals.currency = currency;
};

const parsePath = (pathname) => {
  const pathParams = pathname.split('/');
  let language = defaultLocale;
  let page;
  let params = [];

  if (locales.includes(pathParams[1])) {
    language = pathParams[1];
    page = pathParams[2];
    params = pathParams.slice(3);
  } else {
    page = pathParams[1];
    params = pathParams.slice(2);
  }

  return { language, page, params };
};

const redirect = (url) =>
  new Response(null, {
    status: 302,
    headers: {
      Location: url
    }
  });

const authenticate = (context) => {
  const loggedInUser = getSessionUser(context.request);

  context.locals.loggedInUser = loggedInUser;
};

const pages = [
  'brewing-methods',
  'login',
  'origin-countries',
  'processing-methods',
  'registration',
  'roasters',
  'taste-note-groups',
  'varieties',
  'you'
];

/**
 * @type {import("astro").MiddlewareHandler}
 */
// eslint-disable-next-line complexity
const onRequest = async (context, next) => {
  const { page, params } = parsePath(context.url.pathname);

  if (page !== 'api' && !context.params.locale && (context.routePattern !== '/404' || pages.includes(page))) {
    const acceptLanguage = context.request.headers.get('accept-language')?.slice(0, 2) || defaultLocale;
    const locale = locales.find((l) => l === acceptLanguage);

    return context.rewrite(
      new Request(`${context.url.origin}/${locale}${context.url.pathname}${context.url.search}`, {
        headers: context.request.headers
      })
    );
  }

  await setCurrency(context);
  setGetSignedUrl(context);
  setImageUploadUrls(context);

  try {
    // set the user if we have it
    authenticate(context);
  } catch {
    // DO NOTHING
  }

  await setRecommended(context);

  const { itemId, collectionId, locale } = context.params;

  let savedLocaleDB;

  try {
    const settings = await getValue({ user: { name: getSessionUser(context.request)?.username }, key: 'settings' });

    savedLocaleDB = settings?.language;
  } catch {
    console.info('Not logged in, so could not read language from DB.');
  }

  const savedLocale = context.cookies.get(cookieNameLocale)?.value || savedLocaleDB;

  if (savedLocale && locale && savedLocale !== locale && locales.includes(locale)) {
    let url = `/${savedLocale}`;

    if (page) {
      url += `/${page}`;
    }

    if (params.length) {
      url += `/${params.join('/')}`;
    }

    return redirect(url);
  }

  if (page === 'api' && params[0] !== 'authentication') {
    try {
      authenticate(context);
    } catch (error) {
      console.error(error);

      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }
  }

  if (page === 'you') {
    try {
      const loggedInUser = getSessionUser(context.request);

      context.locals.username = loggedInUser?.username;

      if (!collectionId) {
        await setCollections(context);
      } else if (collectionId && itemId) {
        await setCollections(context); // to enable the 'add to collection' feature
        await setCollectionItem(context, itemId);
      }
    } catch (error) {
      console.error(error);

      context.locals.shouldAuthenticate = true;

      const username = getUsername(context.request);

      if (username) {
        context.locals.authenticationOptions = JSON.stringify(await getAuthenticationOptions(username));
      }
    }
  }

  if (page === 'registration' && params[0] !== 'error') {
    const registrationCode = context.url.searchParams.get('code');
    const username = params[0];

    if (registrationCode) {
      try {
        const decoded = jwt.verify(registrationCode, sessionSecret);

        if (decoded.username !== username) {
          return redirect('/registration/error?name=JsonWebTokenError');
        }
      } catch (error) {
        console.error(error);

        return redirect(`/registration/error?name=${error.name}`);
      }
    } else {
      return redirect('/registration/error?name=JsonWebTokenError');
    }

    if (username) {
      try {
        const registrationOptions = await createRegistrationOptions(username);

        context.locals.registrationOptions = JSON.stringify(registrationOptions);
      } catch (error) {
        console.error(error);
      }
    }
  }

  return next();
};

export { onRequest };
