const onRequest = async (context, next) => {
  const isIOS = true;
  const response = await next(); // eslint-disable-line callback-return
  const html = await response.text();
  const extendedHTML = html.replace('{{isIOS}}', isIOS);

  return new Response(extendedHTML, {
    status: response.status,
    headers: response.headers
  });
};

export { onRequest };
