import { readFileSync } from 'node:fs';
import { logUsage, runClaude } from './lib/claude.js';
import * as prs from './lib/prs.js';
import * as tasks from './lib/tasks.js';
import { diffFixesError } from './lib/verdict.js';

const MODEL = process.env.AGENT_MODEL || 'claude-opus-5';

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

const defaultBranch = (root) => {
  try {
    return tasks.git(['rev-parse', '--abbrev-ref', 'origin/HEAD'], { cwd: root }).replace(/^origin\//, '');
  } catch {
    // actions/checkout never creates the origin/HEAD symref
    return 'main';
  }
};

// Tasks fan out two at a time and one root cause can raise several signatures, so by the time
// this task starts a sibling agent may already have written the very same fix.
// Every sibling is judged, with no file-overlap prefilter: the duplicates worth catching are
// the ones whose fix lives nowhere near the file the error evidence points at.
const SIBLINGS_TO_JUDGE = 8;

const duplicateFix = async (taskContent, root, branch, openPrs) => {
  const siblings = openPrs
    .filter((pr) => pr.headRefName.startsWith('task/') && pr.headRefName !== branch)
    .slice(0, SIBLINGS_TO_JUDGE);
  for (const pr of siblings) {
    let verdict;
    try {
      verdict = await diffFixesError({ evidence: [taskContent.slice(0, 6000)], pr, root });
    } catch (error) {
      console.error(`PR #${pr.number} validation failed: ${error.message}`);
      continue;
    }
    if (verdict?.fixes === true && verdict.confidence !== 'low') {
      return { pr, verdict };
    }
  }
  return undefined;
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  if (!args.task) {
    throw new Error('Usage: yarn workspace @centralbeans/error-scanner fix --task <alarmName>');
  }
  const alarmId = args.task.replace(/^task\//, '');
  const root = tasks.repoRoot();
  const found = tasks.findTaskFile(root, alarmId);
  if (!found) {
    throw new Error(`No task file found for alarm ${alarmId}`);
  }
  if (found.status !== 'open') {
    console.log(`Task ${alarmId} is "${found.status}", nothing to do.`);
    return;
  }

  const useGh = prs.hasGh() && Boolean(process.env.GH_TOKEN);
  const branch = `task/${alarmId}`;
  const openPrs = useGh ? prs.parseOpenPrs(prs.listOpenPrs()) : [];
  if (prs.prForBranch(openPrs, branch)) {
    console.log(`Task ${alarmId} already has an open PR, skipping.`);
    return;
  }

  const duplicate = useGh ? await duplicateFix(readFileSync(found.path, 'utf8'), root, branch, openPrs) : undefined;
  if (duplicate) {
    console.log(`Task ${alarmId} is already fixed by PR #${duplicate.pr.number}: ${duplicate.verdict.reason}`);
    console.log('Leaving the task open so the next scan can settle it against that PR.');
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
  // found was resolved before the checkout; a resumed task branch may already have moved the file to in-review
  const brief = tasks.findTaskFile(root, alarmId);
  if (!brief) {
    throw new Error(`No task file found for task ${alarmId} on branch ${branch}`);
  }
  const taskContent = readFileSync(brief.path, 'utf8');
  const instructions = [
    'You are an autonomous agent fixing a production error in this repository. You run non-interactively, so never ask questions — make reasonable decisions and record them.',
    '',
    `The full task brief is piped via stdin and also saved at agent-tasks/${brief.status}/${brief.fileName}.`,
    '',
    'Steps:',
    '1. Read AGENTS.md and follow the repository conventions.',
    '2. Investigate the error from the task brief and find the root cause. Reproduce it if possible (parser workspaces need the ROASTER_ID environment variable).',
    '3. Implement a minimal fix. Only touch packages related to the error.',
    '4. Run the relevant workspace tests, `yarn lint`, and `yarn format`. Fix any failures caused by your changes and commit the formatting fixes. Run the tests that already exist; do not write new ones.',
    `5. Move the task file: git mv agent-tasks/${brief.status}/${brief.fileName} agent-tasks/in-review/${brief.fileName} (skip the move if it is already there), set its front matter status to "in-review", and add a short root-cause and fix note to the file.`,
    `6. Commit everything with the message: fix(${alarmId}): <short description>`,
    `7. Push the branch: git push -u origin ${branch}`,
    useGh
      ? `8. Create the pull request: gh pr create --base ${base} --head ${branch} --title "fix(${alarmId}): <short description>" with a body covering what was wrong, what changed, and how it was tested. Include the error signature from the task file.`
      : '8. gh is unavailable: push the branch to the origin remote (and github, if present) and stop. A human opens the PR.',
    '',
    `Hard rules: never commit on or push to ${base}, never modify .github/workflows, never touch other task files or agent-tasks/state.json.`,
    'Add no attribution to your work: no Co-Authored-By trailer on commits, no generated-with footer in the pull request body.',
    'Write no tests: never add a test file, a test case, or a test script. The repository owner decides what gets tested, and an unasked-for test is a change they have to review and undo.',
    'Keep the change to the error at hand. If the fix you are about to write looks like it belongs to a different task, say so in the PR body rather than widening the diff.',
    `If branch ${branch} already contains earlier work-in-progress commits for this task, review them and continue from there instead of restarting.`
  ].join('\n');

  // The agent commits on its own, and a fresh CI checkout has no git identity to commit with.
  tasks.configureBotIdentity(root);

  console.log(`Starting fix agent for task ${alarmId}...`);
  const payload = await runClaude({
    prompt: instructions,
    stdin: taskContent,
    model: MODEL,
    cwd: root,
    timeoutMinutes: Number(process.env.AGENT_TIMEOUT_MINUTES ?? 75)
  });
  logUsage(`Fix agent for ${alarmId}`, payload);
  console.log(payload.result ?? '');

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
