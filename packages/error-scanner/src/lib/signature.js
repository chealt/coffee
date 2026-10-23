import { createHash } from 'node:crypto';

const alarmSignature = (alarm) => `alarm | ${alarm.name}`;

const shortHash = (signature) => createHash('sha1').update(signature).digest('hex').slice(0, 8);

const slugify = (text) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30)
    .replace(/-+$/g, '');

export { alarmSignature, shortHash, slugify };
