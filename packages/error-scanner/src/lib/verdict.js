import { logUsage, runClaude } from './claude.js';
import * as prs from './prs.js';

// Judging one diff is cheap work next to writing a fix, so it runs on the smaller model.
const VERDICT_MODEL = process.env.AGENT_VERDICT_MODEL || 'claude-sonnet-5';

const VERDICT_SCHEMA = {
  type: 'object',
  properties: {
    fixes: { type: 'boolean' },
    confidence: { enum: ['high', 'medium', 'low'] },
    reason: { type: 'string' }
  },
  required: ['fixes', 'confidence', 'reason'],
  additionalProperties: false
};

const FILE_PATTERN = /[\w.-]+\.(?:js|mjs|cjs|ts|astro)(?=:\d+|\W|$)/g;

const mentionedFiles = (texts, logGroup) => {
  const names = new Set();
  const functionName = logGroup?.split('/').pop();
  if (functionName) {
    names.add(functionName);
  }
  for (const text of texts) {
    for (const match of text.matchAll(FILE_PATTERN)) {
      names.add(match[0]);
    }
  }
  return names;
};

const touchesMentionedFiles = (changedFiles, names) =>
  changedFiles.some((file) => {
    const base = file.split('/').pop();
    return [...names].some((name) => base.includes(name) || name.includes(base));
  });

const diffFixesError = async ({ evidence, pr, root, timeoutMinutes = 10 }) => {
  const diff = prs.prDiff(pr.number).slice(0, 40000);
  const prompt = [
    'You validate whether a pull request already fixes a production error, so the same fix is not written twice.',
    '',
    'Production error evidence:',
    '```',
    ...evidence,
    '```',
    '',
    `Diff of PR #${pr.number} (possibly truncated):`,
    '```diff',
    diff,
    '```',
    '',
    'Does the PR diff address the error above? Give the reason in one sentence.'
  ].join('\n');
  const payload = await runClaude({
    prompt,
    model: VERDICT_MODEL,
    cwd: root,
    timeoutMinutes,
    jsonSchema: VERDICT_SCHEMA,
    noTools: true
  });
  logUsage(`PR #${pr.number} verdict`, payload);
  return payload.structured_output;
};

export { diffFixesError, mentionedFiles, touchesMentionedFiles };
