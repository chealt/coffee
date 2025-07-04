import { getSessionUser } from '../../../server/authentication/session.js';
import { generateUploadUrl } from '../../../server/cloudflare/r2/storage.js';

const POST = async ({ request }) => {
  const { username } = getSessionUser(request);
  const { filename, contentType, method } = await request.json();

  try {
    const url = await generateUploadUrl({ username, filename, contentType, method });

    return new Response(JSON.stringify({ url }), { status: 200 });
  } catch (error) {
    console.error(error); // eslint-disable-line no-console

    // return new Response(JSON.stringify({ error: 'Failed to generate upload URL' }), {
    return new Response(JSON.stringify({ error }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export { POST };
