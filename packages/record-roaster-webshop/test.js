import { handler } from './src/index.js';

const roasterId = process.env.ROASTER_ID;

if (!roasterId) {
  throw new Error('No roaster id found, please provide a ROASTER_ID environment variable');
}

const result = await handler({ roasterId: Number(roasterId), isTest: true });

console.log(result);
