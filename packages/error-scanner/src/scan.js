import { listAlarmsInAlarm } from './lib/aws.js';
import { extractJson, runPi } from './lib/pi.js';
import * as prs from './lib/prs.js';
import { alarmSignature } from './lib/signature.js';
import * as tasks from './lib/tasks.js';

const MODEL = process.env.AGENT_MODEL || 'sonnet';

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

const mentionedFiles = (cluster) => {
  const names = new Set();
  const functionName = cluster.logGroup?.split('/').pop();
  if (functionName) {
    names.add(functionName);
  }
  for (const sample of cluster.samples) {
    for (const match of sample.matchAll(/[\w.-]+\.(?:js|mjs|cjs|ts|astro)(?=:\d+|\W|$)/g)) {
      names.add(match[0]);
    }
  }
  return names;
};

const findCandidatePrs = (cluster, openPrs) => {
  const external = openPrs.filter((pr) => !/^task\/\d+$/.test(pr.headRefName));
  const names = mentionedFiles(cluster);
  const candidates = [];
  for (const pr of external) {
    try {
      const changedFiles = prs.prChangedFiles(pr.number);
      const touches = changedFiles.some((file) => {
        const base = file.split('/').pop();
        return [...names].some((name) => base.includes(name) || name.includes(base));
      });
      if (touches) {
        candidates.push({ pr, changedFiles });
      }
    } catch (error) {
      console.error(`Could not inspect PR #${pr.number}: ${error.message}`);
    }
  }
  return candidates;
};

const validatePrFixesError = async (cluster, pr, root) => {
  const diff = prs.prDiff(pr.number).slice(0, 40000);
  const prompt = [
    'You validate whether an open pull request already fixes a production error, so a duplicate fix task is not created.',
    '',
    'Production error evidence:',
    '```',
    ...cluster.samples.map((sample) => sample.slice(0, 2000)),
    '```',
    '',
    `Diff of open PR #${pr.number} (possibly truncated):`,
    '```diff',
    diff,
    '```',
    '',
    'Does the PR diff address the error above? Answer ONLY with JSON:',
    '{"fixes": true|false, "confidence": "high"|"medium"|"low", "reason": "one sentence"}'
  ].join('\n');
  const output = await runPi({
    prompt,
    model: MODEL,
    provider: process.env.PI_PROVIDER,
    cwd: root,
    timeoutMinutes: 10
  });
  return extractJson(output);
};

const checkOpenPrCoverage = async (cluster, ctx) => {
  if (!ctx.usePrs) {
    return { pr: null, note: '' };
  }
  let note = '';
  for (const { pr } of findCandidatePrs(cluster, ctx.openPrs)) {
    let verdict;
    try {
      verdict = await validatePrFixesError(cluster, pr, ctx.root);
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
  const alarmId = cluster.signature;
  const task = {
    id: alarmId,
    status: 'open',
    logGroup: cluster.logGroup,
    firstSeen: ctx.todayStr,
    lastSeen: ctx.todayStr,
    occurrences: cluster.occurrences,
    samples: cluster.samples,
    prNote
  };
  tasks.writeTaskFile(ctx.root, task, { region: ctx.region });
  ctx.state.signatures[cluster.signature] = {
    status: 'open',
    firstSeen: ctx.todayStr,
    lastSeen: ctx.todayStr,
    occurrences: cluster.occurrences
  };
  ctx.created.push(alarmId);
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

const labelEntry = (entry, alarmId, root) =>
  alarmId && tasks.findTaskFile(root, alarmId) ? alarmId : `PR #${entry.prNumber}`;

const findPrForEntry = (entry, openPrs, root, alarmId) => {
  if (alarmId && tasks.findTaskFile(root, alarmId)) {
    return prs.prForBranch(openPrs, `task/${alarmId}`);
  }
  return openPrs.find((candidate) => candidate.number === entry.prNumber);
};

const reopenEntry = (entry, reason, ctx, alarmId) => {
  tasks.moveTaskFile(ctx.root, alarmId, 'in-review', 'open');
  const found = tasks.findTaskFile(ctx.root, alarmId);
  if (found) {
    tasks.updateFrontMatter(found.path, { status: 'open' });
  }
  entry.status = 'open';
  delete entry.prNumber;
  ctx.reopened.push(`${alarmId}: PR ${reason}`);
};

const handleOpenEntry = (entry, pr, ctx, alarmId) => {
  if (pr) {
    entry.status = 'pr-open';
    entry.prNumber = pr.number;
    ctx.updated.push(`${alarmId}: agent PR #${pr.number} in flight`);
    return;
  }
  const found = tasks.findTaskFile(ctx.root, alarmId);
  if (found?.status === 'open') {
    tasks.updateFrontMatter(found.path, { lastSeen: ctx.todayStr, occurrences: entry.occurrences });
  }
  ctx.updated.push(`${alarmId}: still open (${entry.occurrences} total occurrences)`);
};

const handleInFlightEntry = (cluster, entry, pr, ctx) => {
  if (pr) {
    ctx.updated.push(`${labelEntry(entry, cluster.signature, ctx.root)}: PR in flight, counts updated`);
    return;
  }
  const prInfo = entry.prNumber !== undefined && ctx.usePrs ? JSON.parse(prs.prState(entry.prNumber)) : null;
  const merged = Boolean(prInfo?.mergedAt);
  if (tasks.findTaskFile(ctx.root, cluster.signature)) {
    reopenEntry(entry, merged ? 'merged but error persists (regression)' : 'closed without merge', ctx, cluster.signature);
    return;
  }
  createTask(
    cluster,
    `Previously covered by PR #${entry.prNumber} which was ${merged ? 'merged' : 'closed'}, but the error persists.`,
    ctx
  );
};

const handleDoneEntry = (entry, ctx, alarmId) => {
  tasks.moveTaskFile(ctx.root, alarmId, 'done', 'open');
  const found = tasks.findTaskFile(ctx.root, alarmId);
  if (found) {
    tasks.updateFrontMatter(found.path, { status: 'open', lastSeen: ctx.todayStr, occurrences: entry.occurrences });
  }
  entry.status = 'open';
  ctx.reopened.push(`${alarmId}: error reappeared after being fixed`);
};

const handleExistingCluster = (cluster, entry, ctx) => {
  entry.lastSeen = ctx.todayStr;
  entry.occurrences = (entry.occurrences ?? 0) + cluster.occurrences;
  const pr = findPrForEntry(entry, ctx.openPrs, ctx.root, cluster.signature);
  if (entry.status === 'open') {
    handleOpenEntry(entry, pr, ctx, cluster.signature);
  } else if (entry.status === 'pr-open') {
    handleInFlightEntry(cluster, entry, pr, ctx);
  } else if (entry.status === 'done') {
    handleDoneEntry(entry, ctx, cluster.signature);
  }
};

const settleAbsentEntries = (seen, ctx) => {
  for (const [signature, entry] of Object.entries(ctx.state.signatures)) {
    if (seen.has(signature) || entry.status !== 'pr-open') {
      continue;
    }
    if (findPrForEntry(entry, ctx.openPrs, ctx.root, signature)) {
      continue;
    }
    const found = tasks.findTaskFile(ctx.root, signature);
    if (!found) {
      entry.status = 'done';
      continue;
    }
    if (found.status !== 'in-review') {
      continue;
    }
    tasks.moveTaskFile(ctx.root, signature, 'in-review', 'done');
    const moved = tasks.findTaskFile(ctx.root, signature);
    if (moved) {
      tasks.updateFrontMatter(moved.path, { status: 'done' });
    }
    entry.status = 'done';
  }
};

const printSummary = (clusters, alarms, ctx) => {
  console.log(`Scanned ${clusters.length} error clusters (${alarms.length} alarms in ALARM).`);
  const sections = [
    ['Covered by open PR', ctx.coveredByPr],
    ['New tasks', ctx.created],
    ['Updated', ctx.updated],
    ['Reopened', ctx.reopened]
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

const collectClusters = async (region) => {
  const alarms = await listAlarmsInAlarm({ region });
  const clusters = alarms.map((alarm) => ({
    signature: alarmSignature(alarm),
    alarm,
    logGroup: alarm.dimensions.find((dimension) => dimension.startsWith('/aws/lambda/')) ?? '',
    occurrences: 1,
    samples: [`${alarm.name}: ${alarm.reason}`.slice(0, 2000)],
    lastTimestamp: null,
    source: 'alarm'
  }));
  return { clusters, alarms };
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
    coveredByPr: []
  };

  const { clusters, alarms } = await collectClusters(region);
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
  settleAbsentEntries(seen, ctx);
  printSummary(clusters, alarms, ctx);

  if (args.dryRun) {
    console.log('\nDry run: nothing written, nothing committed, no dispatch.');
    return;
  }

  tasks.saveState(root, ctx.state);
  const message = `chore(error-scan): ${ctx.todayStr} — ${ctx.created.length} new, ${ctx.updated.length} updated, ${ctx.reopened.length} reopened`;
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
