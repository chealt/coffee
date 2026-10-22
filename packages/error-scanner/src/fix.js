import { readFileSync } from 'node:fs';
import { runPi } from './lib/pi.js';
import * as prs from './lib/prs.js';
import * as tasks from './lib/tasks.js';

const MODEL = process.env.AGENT_MODEL || 'sonnet';

const parseArgs = (argv) => {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--task') {
      args.task = argv[++i];
    } else if (arg.startsWith('--task=')) {
      args.task = arg.slice(7);
    }
  }
  return args;
};

const defaultBranch = (root) =>
  tasks.git(['rev-parse', '--abbrev-ref', 'origin/HEAD'], { cwd: root }).replace(/^origin\//, '') || 'main';

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  if (!args.task) {
    throw new Error('Usage: yarn workspace @centralbeans/error-scanner fix --task <taskId>');
  }
  const taskId = args.task.replace(/^task\//, '').padStart(4, '0');
  const root = tasks.repoRoot();
  const found = tasks.findTaskFile(root, taskId);
  if (!found) {
    throw new Error(`No task file found for task ${taskId}`);
  }
  if (found.status !== 'open') {
    console.log(`Task ${taskId} is "${found.status}", nothing to do.`);
    return;
  }

  const useGh = prs.hasGh() && Boolean(process.env.GH_TOKEN);
  const branch = `task/${taskId}`;
  if (useGh && prs.prForBranch(prs.parseOpenPrs(prs.listOpenPrs()), branch)) {
    console.log(`Task ${taskId} already has an open PR, skipping.`);
    return;
  }

  try {
    tasks.git(['fetch', 'origin', branch], { cwd: root });
    tasks.git(['checkout', branch], { cwd: root });
    console.log(`Continuing existing branch ${branch}.`);
  } catch {
    tasks.git(['checkout', '-b', branch], { cwd: root });
    console.log(`Created branch ${branch}.`);
  }

  const base = defaultBranch(root);
  const taskContent = readFileSync(found.path, 'utf8');
  const instructions = [
    'You are an autonomous agent fixing a production error in this repository. You run non-interactively, so never ask questions — make reasonable decisions and record them.',
    '',
    `The full task brief is piped via stdin and also saved at agent-tasks/open/${found.fileName}.`,
    '',
    'Steps:',
    '1. Read AGENTS.md and follow the repository conventions.',
    '2. Investigate the error from the task brief and find the root cause. Reproduce it if possible (parser workspaces need the ROASTER_ID environment variable).',
    '3. Implement a minimal fix. Only touch packages related to the error.',
    '4. Run the relevant workspace tests and `yarn lint`. Fix any failures caused by your changes.',
    `5. Move the task file: git mv agent-tasks/open/${found.fileName} agent-tasks/in-review/${found.fileName}, set its front matter status to "in-review", and add a short root-cause and fix note to the file.`,
    `6. Commit everything with the message: fix(${taskId}): <short description>`,
    `7. Push the branch: git push -u origin ${branch}`,
    useGh
      ? `8. Create the pull request: gh pr create --base ${base} --head ${branch} --title "fix(${taskId}): <short description>" with a body covering what was wrong, what changed, and how it was tested. Include the error signature from the task file.`
      : '8. gh is unavailable: push the branch to the origin remote (and github, if present) and stop. A human opens the PR.',
    '',
    `Hard rules: never commit on or push to ${base}, never modify .github/workflows, never touch other task files or agent-tasks/state.json.`,
    `If branch ${branch} already contains earlier work-in-progress commits for this task, review them and continue from there instead of restarting.`
  ].join('\n');

  console.log(`Starting fix agent for task ${taskId}...`);
  await runPi({
    prompt: instructions,
    stdin: taskContent,
    model: MODEL,
    provider: process.env.PI_PROVIDER,
    cwd: root,
    timeoutMinutes: Number(process.env.AGENT_TIMEOUT_MINUTES ?? 75)
  });

  if (useGh) {
    const pr = prs.prForBranch(prs.parseOpenPrs(prs.listOpenPrs()), branch);
    if (!pr) {
      console.error('Agent finished without creating a PR. Task stays open and will be retried.');
      process.exit(1);
    }
    console.log(`PR created: ${pr.url}`);
  } else {
    console.log('gh unavailable: branch pushed, a human needs to open the PR.');
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
