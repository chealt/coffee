import jwt from 'jsonwebtoken';

import { sessionSecret } from './server/authentication/config.js';
import { getSessionUser } from './server/authentication/session.js';
import { getAuthenticationOptions } from './server/login.js';
import { createRegistrationOptions } from './server/registration.js';

const isIOS = (userAgent) => /iPad|iPhone|iPod/u.test(userAgent);

const setClientSideOCR = (context) => {
  const userAgent = context.request.headers.get('user-agent');

  context.locals.clientSideOCR = !isIOS(userAgent);
};

const setIsIOS = (context) => {
  const userAgent = context.request.headers.get('user-agent');

  context.locals.isIOS = isIOS(userAgent);
};

const languages = ['pl', 'en'];

const parsePath = (pathname) => {
  const pathParams = pathname.split('/');
  let language = 'en';
  let page;
  let params = [];

  if (languages.includes(pathParams[1])) {
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

// eslint-disable-next-line complexity
const onRequest = async (context, next) => {
  const { page, params } = parsePath(context.url.pathname);

  if (page === 'api') {
    const loggedInUser = getSessionUser(context.request);

    if (!loggedInUser && params[1] !== 'login' && params[1] !== 'registration') {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }
  }

  try {
    const loggedInUser = getSessionUser(context.request);

    context.locals.loggedInUser = loggedInUser;

    if (loggedInUser) {
      context.locals.getSignedUrl = '/api/storage/get-signed-url.json';
    }
  } catch (error) {
    console.error(error); // eslint-disable-line no-console
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
        console.error(error); // eslint-disable-line no-console

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
        console.error(error); // eslint-disable-line no-console
      }
    }
  } else if (page === 'login') {
    const username = params[0];

    if (username) {
      try {
        const authenticationOptions = await getAuthenticationOptions(username);

        context.locals.authenticationOptions = JSON.stringify(authenticationOptions);
      } catch (error) {
        console.error(error); // eslint-disable-line no-console
      }
    }
  }

  setClientSideOCR(context);
  setIsIOS(context);

  return next();
};

export { onRequest };
