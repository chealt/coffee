import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const STATUSES = ['open', 'in-review', 'done'];

const git = (args, options = {}) =>
  execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...options }).trim();

const repoRoot = () => git(['rev-parse', '--show-toplevel']);

const tasksDir = (root) => join(root, 'agent-tasks');

const statePath = (root) => join(tasksDir(root), 'state.json');

const loadState = (root) => {
  const path = statePath(root);
  if (!existsSync(path)) {
    return { signatures: {} };
  }
  return JSON.parse(readFileSync(path, 'utf8'));
};

const saveState = (root, state) => {
  mkdirSync(tasksDir(root), { recursive: true });
  writeFileSync(statePath(root), `${JSON.stringify(state, null, 2)}\n`);
};

const parseFrontMatter = (content) => {
  const lines = content.split('\n');
  if (lines[0] !== '---') {
    return { data: {}, body: content };
  }
  const end = lines.indexOf('---', 1);
  if (end === -1) {
    return { data: {}, body: content };
  }
  const data = {};
  for (const line of lines.slice(1, end)) {
    const separator = line.indexOf(':');
    if (separator === -1) {
      continue;
    }
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    if (value.startsWith('"')) {
      try {
        data[key] = JSON.parse(value);
      } catch {
        data[key] = value;
      }
    } else if (/^\d+$/.test(value)) {
      data[key] = Number(value);
    } else {
      data[key] = value;
    }
  }
  return { data, body: lines.slice(end + 1).join('\n') };
};

const renderFrontMatter = (data) =>
  Object.entries(data)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${key}: ${typeof value === 'string' ? JSON.stringify(value) : value}`)
    .join('\n');

const updateFrontMatter = (path, updates) => {
  const { data, body } = parseFrontMatter(readFileSync(path, 'utf8'));
  Object.assign(data, updates);
  writeFileSync(path, `---\n${renderFrontMatter(data)}\n---${body}`);
};

const findTaskFile = (root, alarmId) => {
  for (const status of STATUSES) {
    const dir = join(tasksDir(root), status);
    if (!existsSync(dir)) {
      continue;
    }
    const fileName = `${alarmId}.md`;
    if (readdirSync(dir).includes(fileName)) {
      return { path: join(dir, fileName), fileName, status, dir };
    }
  }
  return undefined;
};

const consoleUrl = (region) => `https://${region}.console.aws.amazon.com/cloudwatch/home?region=${region}#alarms:v2`;

const renderTask = (task, { region }) => `---
id: "${task.id}"
status: "${task.status}"
alarm: "${task.alarm}"
signature: ${JSON.stringify(task.signature ?? '')}
logGroup: ${JSON.stringify(task.logGroup ?? '')}
firstSeen: "${task.firstSeen}"
lastSeen: "${task.lastSeen}"
occurrences: ${task.occurrences}
---

# Task ${task.id}

Detected by the weekly error scan on ${task.lastSeen}. Triggering alarm: \`${task.alarm}\`.

- **Occurrences:** ${task.occurrences}
- **Log group:** \`${task.logGroup ?? 'n/a'}\`
- **Signature:** \`${task.signature ?? ''}\`
${task.prNote ? `\n> Open PR check: ${task.prNote}\n` : ''}
## Sample errors

\`\`\`
${task.samples.join('\n\n---\n\n')}
\`\`\`

## CloudWatch

Alarm console: ${consoleUrl(region)}

## Definition of done

- [ ] Root cause identified and reproduced (add a short note to this file)
- [ ] Minimal fix implemented
- [ ] Relevant tests run and passing
- [ ] \`yarn lint\` passes
- [ ] This file moved to \`agent-tasks/in-review/\` with status "in-review" in the fix commit
`;

const writeTaskFile = (root, task, options) => {
  const dir = join(tasksDir(root), 'open');
  mkdirSync(dir, { recursive: true });
  const fileName = `${task.id}.md`;
  const path = join(dir, fileName);
  writeFileSync(path, renderTask(task, options));
  return { path, fileName };
};

const moveTaskFile = (root, alarmId, fromStatus, toStatus) => {
  const found = findTaskFile(root, alarmId);
  if (!found || found.status !== fromStatus) {
    return false;
  }
  const targetDir = join(tasksDir(root), toStatus);
  mkdirSync(targetDir, { recursive: true });
  try {
    git(['mv', found.path, join(targetDir, found.fileName)], { cwd: root });
  } catch {
    renameSync(found.path, join(targetDir, found.fileName));
  }
  return true;
};

const configureBotIdentity = (root) => {
  if (!process.env.GITHUB_ACTIONS) {
    return;
  }
  git(['config', 'user.name', 'github-actions[bot]'], { cwd: root });
  git(['config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com'], { cwd: root });
};

const commitAndPush = (root, message) => {
  git(['add', 'agent-tasks'], { cwd: root });
  const status = git(['status', '--porcelain', '--', 'agent-tasks'], { cwd: root });
  if (!status) {
    return false;
  }
  configureBotIdentity(root);
  git(['commit', '-m', message], { cwd: root });
  git(['pull', '--rebase', 'origin', 'main'], { cwd: root });
  git(['push', 'origin', 'HEAD'], { cwd: root });
  return true;
};

export {
  commitAndPush,
  configureBotIdentity,
  findTaskFile,
  git,
  loadState,
  moveTaskFile,
  repoRoot,
  saveState,
  tasksDir,
  updateFrontMatter,
  writeTaskFile
};
