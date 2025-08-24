import jwt from 'jsonwebtoken';

import { sessionSecret } from './server/authentication/config.js';
import { getSessionUser } from './server/authentication/session.js';
import { createRegistrationOptions } from './server/registration.js';
import { setCollections, setCollectionItem } from './server/you/collections.js';

const setGetSignedUrl = (context) => {
  context.locals.getSignedUrl = '/api/storage/get-signed-url.json';
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

const authenticate = (context) => {
  const loggedInUser = getSessionUser(context.request);

  context.locals.loggedInUser = loggedInUser;
};

// eslint-disable-next-line complexity
const onRequest = async (context, next) => {
  const { page, params } = parsePath(context.url.pathname);

  if (page === 'api' && params[0] !== 'authentication') {
    try {
      authenticate(context);
    } catch (error) {
      console.error(error); // eslint-disable-line no-console

      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }
  }

  if (page === 'you') {
    try {
      if (!params[1]) {
        await setCollections(context);
      } else if (params[1] && params[3]) {
        const itemId = params[3];

        await setCollections(context); // to enable the 'add to collection' feature
        await setCollectionItem(context, itemId);
      }
    } catch (error) {
      console.error(error); // eslint-disable-line no-console

      context.locals.shouldAuthenticate = true;
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
  }

  setGetSignedUrl(context);

  return next();
};

export { onRequest };
