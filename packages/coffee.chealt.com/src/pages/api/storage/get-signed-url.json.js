import { generateUploadUrl } from '../../../server/AWS/storage.js';
import { getSessionUser } from '../../../server/authentication/session.js';

const POST = async ({ request }) => {
  // check if user is logged in
  getSessionUser(request);

  const { filename, contentType } = await request.json();

  try {
    const url = await generateUploadUrl({ filename, contentType });

    return new Response(JSON.stringify({ url }), { status: 200 });
  } catch (error) {
    console.error(error); // eslint-disable-line no-console

    return new Response(JSON.stringify({ error: 'Failed to generate upload URL' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export { POST };
