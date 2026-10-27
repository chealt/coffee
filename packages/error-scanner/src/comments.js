import { logUsage, runClaude } from './lib/claude.js';
import * as prs from './lib/prs.js';
import * as tasks from './lib/tasks.js';

const MODEL = process.env.AGENT_MODEL || 'claude-opus-5';
const BUDGET_MINUTES = Number(process.env.AGENT_TIMEOUT_MINUTES ?? 5);

const parseArgs = (argv) => {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--pr') {
      args.pr = argv[++i];
    } else if (arg.startsWith('--pr=')) {
      args.pr = arg.slice(5);
    }
  }
  return args;
};

const isPerson = (login) => Boolean(login) && !login.endsWith('[bot]');

// Every run reads the whole thread rather than the one comment that triggered it: a review
// arrives as a burst of events, and the runs cancel each other so only the last one finishes.
const collectFeedback = (number, details) => {
  const feedback = [];
  for (const comment of details.comments ?? []) {
    if (isPerson(comment.author?.login)) {
      feedback.push(`[conversation, ${comment.createdAt}] ${comment.author.login}: ${comment.body}`);
    }
  }
  for (const review of prs.prReviews(number)) {
    // A changes-requested review usually carries no summary of its own, all the detail being
    // in its inline comments. It still has to reach the agent: it is the thing that decides
    // whether the review gets re-requested.
    if (!isPerson(review.user?.login)) {
      continue;
    }
    const body = review.body?.trim();
    if (!body && review.state !== 'CHANGES_REQUESTED') {
      continue;
    }
    feedback.push(
      `[review ${review.state}, ${review.submitted_at}] ${review.user.login}: ${body || '(no summary, the detail is in the inline comments)'}`
    );
  }
  for (const comment of prs.prReviewComments(number)) {
    if (isPerson(comment.user?.login)) {
      const line = comment.line ?? comment.original_line;
      feedback.push(`[${comment.path}:${line}, ${comment.created_at}] ${comment.user.login}: ${comment.body}`);
    }
  }
  return feedback;
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  if (!args.pr) {
    throw new Error('Usage: yarn workspace @centralbeans/error-scanner comments --pr <number>');
  }
  if (!prs.hasGh() || !process.env.GH_TOKEN) {
    throw new Error('gh and GH_TOKEN are required to read and answer pull request comments');
  }
  const number = Number(args.pr);
  const root = tasks.repoRoot();
  const details = prs.prDetails(number);

  if (details.state !== 'OPEN') {
    console.log(`PR #${number} is ${details.state}, nothing to do.`);
    return;
  }
  // Only the scanner's own PRs are answered automatically; everything else is yours to drive.
  if (!details.headRefName.startsWith('task/')) {
    console.log(`PR #${number} is on ${details.headRefName}, not an agent branch. Skipping.`);
    return;
  }

  const feedback = collectFeedback(number, details);
  if (feedback.length === 0) {
    console.log(`PR #${number} has no comments from a person, nothing to do.`);
    return;
  }
  console.log(`Addressing ${feedback.length} comment(s) on PR #${number} (${details.headRefName}).`);

  prs.prCheckout(number);
  tasks.configureBotIdentity(root);

  const instructions = [
    'You are an autonomous agent answering review feedback on your own pull request in this repository. You run non-interactively, so never ask questions — make reasonable decisions and record them.',
    '',
    `The pull request is #${number} ("${details.title}") on branch ${details.headRefName}, already checked out.`,
    'Every comment left by a person is piped via stdin, oldest first, each tagged with where it was left.',
    '',
    'Steps:',
    '1. Read AGENTS.md and follow the repository conventions.',
    '2. Read the pull request diff with `git diff origin/main...HEAD` and the commits already on the branch.',
    '3. Work out which comments still need action. Skip anything a later commit on this branch already handled, and say so rather than redoing it.',
    '4. Make the smallest change that answers the feedback.',
    '5. Run the relevant workspace tests, `yarn lint`, and `yarn format`. Fix any failures caused by your changes. Run the tests that already exist; do not write new ones.',
    '6. Commit with a message describing what the feedback asked for, then push to the same branch.',
    '7. Reply once on the pull request with `gh pr comment` summarising what you changed and anything you deliberately did not change, with the reason.',
    `8. If the newest review from a person is "CHANGES_REQUESTED" and you pushed a change that answers it, re-request that reviewer: \`gh pr edit ${number} --add-reviewer <their login>\`. This is the same action as the re-request button on the pull request. Re-request nobody when you pushed nothing, or when you decided against the change: explain it in your reply instead and leave the review as it stands.`,
    '',
    'Hard rules: never push to main, never modify .github/workflows, never touch agent-tasks/state.json, never change the pull request title or base branch, and never force push.',
    'Write no tests: never add a test file, a test case, or a test script.',
    'Add no attribution to your work: no Co-Authored-By trailer on commits, no generated-with footer in anything you post.',
    'If the feedback asks for something you judge wrong or out of scope, say so in your reply instead of implementing it.'
  ].join('\n');

  const payload = await runClaude({
    prompt: instructions,
    stdin: feedback.join('\n\n'),
    model: MODEL,
    cwd: root,
    timeoutMinutes: BUDGET_MINUTES
  });
  logUsage(`Comment agent for PR #${number}`, payload);
  console.log(payload.result ?? '');
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
