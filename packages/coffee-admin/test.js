import { handler } from './dist/index.js';

await handler({
  function: 'notifications:send-new-coffees'
});
