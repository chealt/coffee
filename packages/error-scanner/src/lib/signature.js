import { createHash } from 'node:crypto';

const normalize = (text) =>
  text
    .replace(/\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})?/g, '<time>')
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '<uuid>')
    .replace(/https?:\/\/\S+/g, '<url>')
    .replace(/(["'`])(?:\\.|(?!\1).){4,}\1/g, '<string>')
    .replace(/\b\d+(\.\d+)?\b/g, '<num>')
    .replace(/\s+/g, ' ')
    .trim();

const headline = (message) => {
  const line = message.split('\n').find((candidate) => candidate.trim().length > 0) ?? '';
  return normalize(line).slice(0, 200);
};

const firstStackFrame = (message) => {
  for (const line of message.split('\n')) {
    const match = line.match(/\bat\s+(.*)/);
    if (match) {
      return normalize(
        match[1]
          .replace(/\/var\/task\//g, '')
          .replace(/\((.*):\d+:\d+\)/, '($1)')
          .trim()
      ).slice(0, 120);
    }
  }
  return '';
};

const buildSignature = ({ logGroup, message }) => {
  const parts = [logGroup, headline(message)];
  const frame = firstStackFrame(message);
  if (frame) {
    parts.push(frame);
  }
  return parts.join(' | ');
};

const alarmSignature = (alarm) => `alarm | ${alarm.name}`;

const shortHash = (signature) => createHash('sha1').update(signature).digest('hex').slice(0, 8);

const slugify = (text) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30)
    .replace(/-+$/g, '');

const clusterBySignature = (entries) => {
  const clusters = new Map();
  for (const entry of entries) {
    const signature = buildSignature(entry);
    const cluster = clusters.get(signature) ?? {
      signature,
      logGroup: entry.logGroup,
      occurrences: 0,
      samples: [],
      lastTimestamp: entry.timestamp
    };
    cluster.occurrences += 1;
    if (cluster.samples.length < 3) {
      cluster.samples.push(entry.message.slice(0, 2000));
    }
    if (entry.timestamp > cluster.lastTimestamp) {
      cluster.lastTimestamp = entry.timestamp;
    }
    clusters.set(signature, cluster);
  }
  return [...clusters.values()];
};

export { alarmSignature, buildSignature, clusterBySignature, normalize, shortHash, slugify };
