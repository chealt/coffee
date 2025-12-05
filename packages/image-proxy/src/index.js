const handler = async (request, env, ctx) => {
  const url = new URL(request.url);

  const cache = caches.default;
  let response = await cache.match(request);

  if (!response) {
    const cloudfrontUrl = new URL(url.pathname, `https://${env.CLOUDFRONT_DOMAIN}`);

    response = await fetch(new Request(cloudfrontUrl, request));

    if (response.status === 200) {
      response = new Response(response.body, response);
      response.headers.set('Cache-Control', 'public, max-age=2592000');

      ctx.waitUntil(cache.put(request, response.clone()));
    }
  }

  return response;
};

export default handler;
