import { createHash } from 'node:crypto';

const MESSAGE_LIMIT = 1000;
const FRAME_LIMIT = 200;
const FRAMES_TO_KEEP = 5;
const URLS_TO_KEEP = 3;

const normalize = (text) =>
  text
    .replace(/https?:\/\/\S+/g, '<url>')
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '<uuid>')
    .replace(/\b\d+(\.\d+)?\b/g, '<num>');

const stackFrames = ({ trace, stack } = {}) =>
  (trace ?? stack ?? [])
    .filter((line) => /^\s*at\s/.test(line))
    .slice(0, FRAMES_TO_KEEP)
    .map((line) => line.trim().slice(0, FRAME_LIMIT));

const withoutPosition = (frame = '') => frame.replace(/:\d+:\d+\)?$/, '');

const taskIdFor = ({ functionName, roasterId, errorType, errorMessage, stack }) => {
  const fingerprint = [functionName, roasterId, errorType, normalize(errorMessage), withoutPosition(stack[0])];
  const hash = createHash('sha1').update(fingerprint.join('|')).digest('hex').slice(0, 8);

  return `${functionName}-${hash}`;
};

// The event's html field is left behind on purpose: it does not fit in a workflow input, and
// the agent can fetch the page from the url.
const parseFailure = ({ body }) => {
  const { requestContext = {}, requestPayload, responsePayload } = JSON.parse(body);

  return {
    functionName: requestContext.functionArn?.split(':')[6] ?? 'unknown',
    condition: requestContext.condition,
    requestId: requestContext.requestId,
    roasterId: requestPayload?.roasterId,
    url: requestPayload?.url,
    errorType: responsePayload?.errorType ?? 'Unknown',
    errorMessage: String(responsePayload?.errorMessage ?? requestContext.condition).slice(0, MESSAGE_LIMIT),
    stack: stackFrames(responsePayload)
  };
};

const groupFailures = (records) => {
  const groups = new Map();

  for (const record of records) {
    const failure = parseFailure(record);
    const taskId = taskIdFor(failure);
    const { url, ...context } = failure;
    const group = groups.get(taskId) ?? { taskId, context: { ...context, occurrences: 0, urls: [] } };

    group.context.occurrences += 1;

    if (url && group.context.urls.length < URLS_TO_KEEP) {
      group.context.urls.push(url);
    }

    groups.set(taskId, group);
  }

  return [...groups.values()];
};

export { groupFailures };
