import { listFiredAlarms, queryLogErrors } from './lib/aws.js';
import * as prs from './lib/prs.js';
import { clusterBySignature, sanitizeAlarmId, shortHash } from './lib/signature.js';
import * as tasks from './lib/tasks.js';
import { diffFixesError, mentionedFiles, touchesMentionedFiles } from './lib/verdict.js';

const parseArgs = (argv) => {
  const args = {
    dryRun: process.env.DRY_RUN === 'true',
    dispatch: true
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--dry-run') {
      args.dryRun = true;
    } else if (arg === '--no-dispatch') {
      args.dispatch = false;
    }
  }
  return args;
};

const today = () => new Date().toISOString().slice(0, 10);

// Another task's open PR counts as coverage: one root cause often fires several signatures,
// and the agents fixing them cannot see each other's work. A sibling task PR is judged on its
// diff with no file-overlap screening, because that kind of fix routinely lands in a file the
// error evidence never names. Unrelated PRs are screened, since there can be many of them.
const findCandidatePrs = (cluster, openPrs) => {
  const ownBranch = `task/${cluster.signature}`;
  const names = mentionedFiles(cluster.samples, cluster.logGroup);
  const candidates = [];
  for (const pr of openPrs.filter((candidate) => candidate.headRefName !== ownBranch)) {
    if (pr.headRefName.startsWith('task/')) {
      candidates.push(pr);
      continue;
    }
    try {
      const changedFiles = prs.prChangedFiles(pr.number).filter((file) => !file.startsWith('agent-tasks/'));
      if (touchesMentionedFiles(changedFiles, names)) {
        candidates.push(pr);
      }
    } catch (error) {
      console.error(`Could not inspect PR #${pr.number}: ${error.message}`);
    }
  }
  return candidates.slice(0, 8);
};

const checkOpenPrCoverage = async (cluster, ctx) => {
  if (!ctx.usePrs) {
    return { pr: null, note: '' };
  }
  let note = '';
  for (const pr of findCandidatePrs(cluster, ctx.openPrs)) {
    let verdict;
    try {
      verdict = await diffFixesError({
        evidence: cluster.samples.map((sample) => sample.slice(0, 2000)),
        pr,
        root: ctx.root
      });
    } catch (error) {
      note = `PR #${pr.number} validation failed: ${error.message}`;
      continue;
    }
    if (typeof verdict?.fixes !== 'boolean') {
      note = `PR #${pr.number} validation was inconclusive.`;
      continue;
    }
    if (verdict.fixes) {
      return { pr, note: `validated: ${verdict.reason ?? ''}` };
    }
    note = `PR #${pr.number} does not fix this: ${verdict.reason ?? 'no reason given'}.`;
  }
  return { pr: null, note };
};

const createTask = (cluster, prNote, ctx) => {
  const taskId = cluster.signature;
  const task = {
    id: taskId,
    status: 'open',
    alarm: cluster.alarm,
    signature: cluster.rawSignature,
    logGroup: cluster.logGroup,
    firstSeen: ctx.todayStr,
    lastSeen: ctx.todayStr,
    occurrences: cluster.occurrences,
    samples: cluster.samples,
    prNote
  };
  if (!ctx.args.dryRun) {
    tasks.writeTaskFile(ctx.root, task, { region: ctx.region });
  }
  ctx.state.signatures[cluster.signature] = {
    status: 'open',
    firstSeen: ctx.todayStr,
    lastSeen: ctx.todayStr,
    occurrences: cluster.occurrences
  };
  ctx.created.push(taskId);
};

const handleNewCluster = async (cluster, ctx) => {
  const coverage = await checkOpenPrCoverage(cluster, ctx);
  if (coverage.pr) {
    ctx.state.signatures[cluster.signature] = {
      status: 'pr-open',
      prNumber: coverage.pr.number,
      firstSeen: ctx.todayStr,
      lastSeen: ctx.todayStr,
      occurrences: cluster.occurrences
    };
    ctx.coveredByPr.push(`${cluster.signature} -> PR #${coverage.pr.number}`);
    return;
  }
  createTask(cluster, coverage.note || undefined, ctx);
};

const taskPr = (ctx, signature) => {
  if (!ctx.usePrs) {
    return { state: 'unknown' };
  }
  const branch = `task/${signature}`;
  const open = prs.prForBranch(ctx.openPrs, branch);
  if (open) {
    return { state: 'open', pr: open };
  }
  let pr;
  try {
    pr = prs.prForBranchAnyState(branch);
  } catch (error) {
    console.error(`Could not look up the pull request for ${branch}: ${error.message}`);
    return { state: 'unknown' };
  }
  if (!pr) {
    return { state: 'none' };
  }
  if (pr.state === 'OPEN') {
    return { state: 'open', pr };
  }
  return { state: pr.state === 'MERGED' ? 'merged' : 'closed', pr };
};

// Every task file move goes through here, so a dry run really does write nothing.
const setTaskStatus = (ctx, signature, fromStatus, toStatus, updates = {}) => {
  if (ctx.args.dryRun) {
    return;
  }
  tasks.moveTaskFile(ctx.root, signature, fromStatus, toStatus);
  const found = tasks.findTaskFile(ctx.root, signature);
  if (found) {
    tasks.updateFrontMatter(found.path, { status: toStatus, ...updates });
  }
};

const touchOpenTask = (ctx, signature, updates) => {
  if (ctx.args.dryRun) {
    return;
  }
  const found = tasks.findTaskFile(ctx.root, signature);
  if (found?.status === 'open') {
    tasks.updateFrontMatter(found.path, updates);
  }
};

const reopenTask = (ctx, signature, entry, fromStatus, reason) => {
  setTaskStatus(ctx, signature, fromStatus, 'open', { lastSeen: ctx.todayStr, occurrences: entry.occurrences });
  entry.status = 'open';
  delete entry.prNumber;
  ctx.reopened.push(`${signature}: ${reason}`);
};

const markPrOpen = (ctx, signature, entry, pr) => {
  entry.status = 'pr-open';
  entry.prNumber = pr.number;
  ctx.updated.push(`${signature}: agent PR #${pr.number} in flight`);
};

const coveringPr = (ctx, entry) =>
  entry.prNumber === undefined ? undefined : ctx.openPrs.find((candidate) => candidate.number === entry.prNumber);

// A task the agent moved to in-review is settled by its pull request, not by the alarm: the fix
// landing is what stops the error from firing, so waiting for another occurrence settles nothing.
const settleReviewedTask = (ctx, signature, entry, lastErrorAt) => {
  const resolved = taskPr(ctx, signature);
  if (resolved.state === 'unknown') {
    return;
  }
  if (resolved.state === 'open') {
    markPrOpen(ctx, signature, entry, resolved.pr);
    return;
  }
  if (resolved.state === 'merged') {
    const mergedAt = Date.parse(resolved.pr.mergedAt ?? '');
    // Log entries carry ISO timestamps, so both sides have to be numbers before comparing.
    const lastError = typeof lastErrorAt === 'number' ? lastErrorAt : Date.parse(lastErrorAt ?? '');
    if (Number.isFinite(lastError) && Number.isFinite(mergedAt) && lastError > mergedAt) {
      reopenTask(ctx, signature, entry, 'in-review', `PR #${resolved.pr.number} merged but the error came back`);
      return;
    }
    setTaskStatus(ctx, signature, 'in-review', 'done');
    entry.status = 'done';
    delete entry.prNumber;
    ctx.closed.push(`${signature}: PR #${resolved.pr.number} merged`);
    return;
  }
  reopenTask(
    ctx,
    signature,
    entry,
    'in-review',
    resolved.state === 'closed' ? `PR #${resolved.pr.number} closed without merging` : 'no pull request was opened'
  );
};

const handleExistingCluster = (cluster, entry, ctx) => {
  entry.lastSeen = ctx.todayStr;
  entry.occurrences = (entry.occurrences ?? 0) + cluster.occurrences;
  const found = tasks.findTaskFile(ctx.root, cluster.signature);
  if (!found) {
    const covering = coveringPr(ctx, entry);
    if (covering) {
      ctx.updated.push(`PR #${covering.number}: still in flight, counts updated`);
      return;
    }
    createTask(
      cluster,
      entry.prNumber === undefined
        ? 'Seen in an earlier scan, but the task file is gone.'
        : `Previously covered by PR #${entry.prNumber}, but the error persists.`,
      ctx
    );
    return;
  }
  if (found.status === 'in-review') {
    settleReviewedTask(ctx, cluster.signature, entry, cluster.lastTimestamp);
    return;
  }
  if (found.status === 'done') {
    reopenTask(ctx, cluster.signature, entry, 'done', 'the error reappeared after being fixed');
    return;
  }
  const resolved = taskPr(ctx, cluster.signature);
  if (resolved.state === 'open') {
    markPrOpen(ctx, cluster.signature, entry, resolved.pr);
    return;
  }
  entry.status = 'open';
  delete entry.prNumber;
  touchOpenTask(ctx, cluster.signature, { lastSeen: ctx.todayStr, occurrences: entry.occurrences });
  ctx.updated.push(`${cluster.signature}: still open (${entry.occurrences} total occurrences)`);
};

// Signatures that did not fire this scan still need settling, because a landed fix is exactly
// what stops a signature from showing up again.
const settleUnseenEntries = (seen, ctx) => {
  for (const [signature, entry] of Object.entries(ctx.state.signatures)) {
    if (seen.has(signature)) {
      continue;
    }
    const found = tasks.findTaskFile(ctx.root, signature);
    if (!found) {
      if (coveringPr(ctx, entry)) {
        continue;
      }
      entry.status = 'done';
      delete entry.prNumber;
      continue;
    }
    if (found.status === 'in-review') {
      settleReviewedTask(ctx, signature, entry, undefined);
      continue;
    }
    if (found.status === 'done') {
      entry.status = 'done';
      delete entry.prNumber;
    }
  }
};

const printSummary = (clusters, alarms, ctx, since, entriesCount) => {
  console.log(
    `Scanned ${clusters.length} error clusters (${alarms.length} alarms fired since ${since.toISOString().slice(0, 10)}, ${entriesCount} log entries matched).`
  );
  const sections = [
    ['Covered by open PR', ctx.coveredByPr],
    ['New tasks', ctx.created],
    ['Updated', ctx.updated],
    ['Reopened', ctx.reopened],
    ['Closed', ctx.closed]
  ];
  for (const [label, items] of sections) {
    if (items.length === 0) {
      continue;
    }
    console.log(`\n${label}:`);
    for (const item of items) {
      console.log(`  - ${item}`);
    }
  }
};

const collectClusters = async (region, since) => {
  const alarms = await listFiredAlarms({ region, since });
  const clusters = [];
  let entriesCount = 0;
  for (const alarm of alarms) {
    const dimension = alarm.dimensions[0];
    if (!dimension) {
      continue;
    }
    const logGroup = dimension.startsWith('/aws/lambda/') ? dimension : `/aws/lambda/${dimension}`;
    const times = alarm.breachTimes.length > 0 ? alarm.breachTimes : [Date.now() - 60 * 60 * 1000];
    const startTime = Math.min(...times) - 5 * 60 * 1000;
    const endTime = Math.max(...times) + 15 * 60 * 1000;
    let entries = [];
    try {
      entries = await queryLogErrors({ region, logGroup, startTime, endTime });
    } catch (error) {
      console.error(`Log query failed for ${alarm.name} (${logGroup}): ${error.message}`);
    }
    entriesCount += entries.length;
    for (const cluster of clusterBySignature(entries)) {
      clusters.push({
        ...cluster,
        signature: `${sanitizeAlarmId(alarm.name)}-${shortHash(cluster.signature)}`,
        rawSignature: cluster.signature,
        alarm: alarm.name
      });
    }
  }
  return { clusters, alarms, entriesCount };
};

const hasOpenTasks = (state) => Object.values(state.signatures).some((entry) => entry.status === 'open');

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  const region = process.env.AWS_REGION;
  if (!region) {
    throw new Error('AWS_REGION is not set');
  }
  const root = tasks.repoRoot();
  const usePrs = prs.hasGh() && Boolean(process.env.GH_TOKEN);
  const ctx = {
    args,
    region,
    root,
    todayStr: today(),
    state: tasks.loadState(root),
    usePrs,
    openPrs: usePrs ? prs.parseOpenPrs(prs.listOpenPrs()) : [],
    created: [],
    updated: [],
    reopened: [],
    closed: [],
    coveredByPr: []
  };

  const since = ctx.state.lastScanAt ? new Date(ctx.state.lastScanAt) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const { clusters, alarms, entriesCount } = await collectClusters(region, since);
  const seen = new Set();
  for (const cluster of clusters) {
    seen.add(cluster.signature);
    const entry = ctx.state.signatures[cluster.signature];
    if (!entry) {
      await handleNewCluster(cluster, ctx);
    } else {
      handleExistingCluster(cluster, entry, ctx);
    }
  }
  settleUnseenEntries(seen, ctx);
  printSummary(clusters, alarms, ctx, since, entriesCount);

  if (args.dryRun) {
    console.log('\nDry run: nothing written, nothing committed, no dispatch.');
    return;
  }

  ctx.state.lastScanAt = new Date().toISOString();
  tasks.saveState(root, ctx.state);
  const message = `chore(error-scan): ${ctx.todayStr} — ${ctx.created.length} new, ${ctx.updated.length} updated, ${ctx.reopened.length} reopened, ${ctx.closed.length} closed`;
  if (!tasks.commitAndPush(root, message)) {
    console.log('No agent-tasks changes to commit.');
  }
  if (args.dispatch && usePrs && (ctx.created.length > 0 || hasOpenTasks(ctx.state))) {
    prs.dispatchWorkflow('errorFix.yml');
    console.log('Dispatched errorFix workflow.');
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
