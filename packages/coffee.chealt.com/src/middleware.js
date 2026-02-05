import jwt from 'jsonwebtoken';

import supportedLanguages from '../data/supportedLanguages.json';
import { getImageUrl } from './server/AWS/storage.js';
import { cookieNameSession, sessionSecret } from './server/authentication/config.js';
import { getUsername } from './server/authentication/cookies.js';
import { getSessionUser } from './server/authentication/session.js';
import { cookieNameLocale, cookieNameCurrency, defaultCurrency } from './server/config.js';
import { getValue, insert } from './server/database/formData.js';
import { getAuthenticationOptions } from './server/login.js';
import { createRegistrationOptions } from './server/registration.js';
import logger from './server/utils/logger.js';
import { setCollections, setCollectionItem } from './server/you/collections.js';

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

const unsubscribe = async ({ user, notificationType }) => {
  const settings = await getValue({ user, key: 'settings' });

  return insert({
    user,
    key: 'settings',
    value: {
      ...settings,
      [notificationType]: undefined
    }
  });
};

const setCurrency = async (context) => {
  const cookieCurrency = context.cookies.get(cookieNameCurrency)?.value;
  let currencyDB;

  try {
    const settings = await getValue({ user: { name: getSessionUser(context)?.username }, key: 'settings' });

    currencyDB = settings?.currency;
  } catch {
    // DO NOTHING
  }

  const currency = currencyDB || cookieCurrency || defaultCurrency;

  context.locals.currency = currency;
};

const setSettings = async (context) => {
  try {
    const settings = await getValue({ user: { name: getSessionUser(context)?.username }, key: 'settings' });

    context.locals.settings = settings;
  } catch {
    // DO NOTHING
  }
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
  const loggedInUser = getSessionUser(context);

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
export const onRequest = async (context, next) => {
  setGetSignedUrl(context);
  setImageUploadUrls(context);

  if (context.isPrerendered) {
    return next();
  }

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

  // set defaults
  let savedLocaleDB = defaultLocale;
  context.locals.currency = defaultCurrency;

  // only try to get the user settings if we have a session cookie
  if (context.cookies.get(cookieNameSession)?.value) {
    await Promise.all([setCurrency(context), setSettings(context)]);

    try {
      // set the user if we have it
      authenticate(context);
    } catch {
      // DO NOTHING
    }

    try {
      const settings = await getValue({ user: { name: getSessionUser(context)?.username }, key: 'settings' });

      savedLocaleDB = settings?.language;
    } catch {
      // DO NOTHING
    }
  }

  const { itemId, collectionId, locale } = context.params;

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
      logger.error(error);

      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }
  }

  if (page === 'you') {
    try {
      const loggedInUser = getSessionUser(context);

      context.locals.username = loggedInUser?.username;

      if (!collectionId) {
        await setCollections(context);
      } else if (collectionId && itemId) {
        await setCollections(context); // to enable the 'add to collection' feature
        await setCollectionItem(context, itemId);
      }

      if (params[0] === 'unsubscribe' && loggedInUser) {
        if (context.params.notificationType) {
          await unsubscribe({
            user: { name: loggedInUser.username },
            notificationType: context.params.notificationType
          });
        }
      } else if (params[0] === 'feedback' && loggedInUser) {
        const feedback = await getValue({ user: { name: loggedInUser.username }, key: 'feedback' });

        context.locals.feedback = feedback;
      }
    } catch (error) {
      logger.error(error);

      context.locals.shouldAuthenticate = true;

      const username = getUsername(context);

      if (username) {
        context.locals.authenticationOptions = JSON.stringify(await getAuthenticationOptions(username));
      }
    }
  }

  if (page === 'registration' && params[0] !== 'error' && params[0] !== 'new-user') {
    const registrationCode = context.url.searchParams.get('code');
    const username = params[0];

    if (registrationCode) {
      try {
        const decoded = jwt.verify(registrationCode, sessionSecret);

        if (decoded.username !== username) {
          return redirect('/registration/error?name=JsonWebTokenError');
        }
      } catch (error) {
        logger.error(error);

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
        logger.error(error);
      }
    }
  }

  return next();
};
