import { ERROR_PATTERN, listAlarmsInAlarm, queryErrors } from './lib/aws.js';
import { extractJson, runPi } from './lib/pi.js';
import * as prs from './lib/prs.js';
import { alarmSignature, clusterBySignature } from './lib/signature.js';
import * as tasks from './lib/tasks.js';

const MODEL = process.env.AGENT_MODEL || 'sonnet';

const parseArgs = (argv) => {
  const args = {
    days: Number(process.env.SCAN_DAYS ?? 7),
    dryRun: process.env.DRY_RUN === 'true',
    dispatch: true
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--dry-run') {
      args.dryRun = true;
    } else if (arg === '--days') {
      args.days = Number(argv[++i]);
    } else if (arg.startsWith('--days=')) {
      args.days = Number(arg.slice(7));
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
  const taskId = tasks.nextTaskId(ctx.root);
  const title =
    cluster.source === 'alarm'
      ? `alarm ${cluster.alarm.name}`
      : (cluster.samples[0] ?? cluster.signature).split('\n')[0].slice(0, 80);
  const task = {
    id: taskId,
    status: 'open',
    source: cluster.source ?? 'logs',
    signature: cluster.signature,
    logGroup: cluster.logGroup,
    title,
    firstSeen: ctx.todayStr,
    lastSeen: ctx.todayStr,
    occurrences: cluster.occurrences,
    samples: cluster.samples,
    prNote
  };
  const { fileName } = tasks.writeTaskFile(ctx.root, task, {
    days: ctx.args.days,
    region: ctx.region,
    pattern: ERROR_PATTERN
  });
  ctx.state.signatures[cluster.signature] = {
    taskId,
    status: 'open',
    firstSeen: ctx.todayStr,
    lastSeen: ctx.todayStr,
    occurrences: cluster.occurrences
  };
  ctx.created.push(`${taskId} (${fileName})`);
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

const labelEntry = (entry) => (entry.taskId !== undefined ? entry.taskId : `PR #${entry.prNumber}`);

const findPrForEntry = (entry, openPrs) => {
  if (entry.taskId !== undefined) {
    return prs.prForBranch(openPrs, `task/${entry.taskId}`);
  }
  return openPrs.find((candidate) => candidate.number === entry.prNumber);
};

const reopenEntry = (entry, reason, ctx) => {
  tasks.moveTaskFile(ctx.root, entry.taskId, 'in-review', 'open');
  const found = tasks.findTaskFile(ctx.root, entry.taskId);
  if (found) {
    tasks.updateFrontMatter(found.path, { status: 'open' });
  }
  entry.status = 'open';
  delete entry.prNumber;
  ctx.reopened.push(`${entry.taskId}: PR ${reason}`);
};

const handleOpenEntry = (entry, pr, ctx) => {
  if (pr) {
    entry.status = 'pr-open';
    entry.prNumber = pr.number;
    ctx.updated.push(`${entry.taskId}: agent PR #${pr.number} in flight`);
    return;
  }
  const found = tasks.findTaskFile(ctx.root, entry.taskId);
  if (found?.status === 'open') {
    tasks.updateFrontMatter(found.path, { lastSeen: ctx.todayStr, occurrences: entry.occurrences });
  }
  ctx.updated.push(`${entry.taskId}: still open (${entry.occurrences} total occurrences)`);
};

const handleInFlightEntry = (cluster, entry, pr, ctx) => {
  if (pr) {
    ctx.updated.push(`${labelEntry(entry)}: PR in flight, counts updated`);
    return;
  }
  const prInfo = entry.prNumber !== undefined && ctx.usePrs ? JSON.parse(prs.prState(entry.prNumber)) : null;
  const merged = Boolean(prInfo?.mergedAt);
  if (entry.taskId !== undefined) {
    reopenEntry(entry, merged ? 'merged but error persists (regression)' : 'closed without merge', ctx);
    return;
  }
  createTask(
    cluster,
    `Previously covered by PR #${entry.prNumber} which was ${merged ? 'merged' : 'closed'}, but the error persists.`,
    ctx
  );
};

const handleDoneEntry = (entry, ctx) => {
  if (entry.taskId !== undefined) {
    tasks.moveTaskFile(ctx.root, entry.taskId, 'done', 'open');
    const found = tasks.findTaskFile(ctx.root, entry.taskId);
    if (found) {
      tasks.updateFrontMatter(found.path, { status: 'open', lastSeen: ctx.todayStr, occurrences: entry.occurrences });
    }
  }
  entry.status = 'open';
  ctx.reopened.push(`${labelEntry(entry)}: error reappeared after being fixed`);
};

const handleExistingCluster = (cluster, entry, ctx) => {
  entry.lastSeen = ctx.todayStr;
  entry.occurrences = (entry.occurrences ?? 0) + cluster.occurrences;
  const pr = findPrForEntry(entry, ctx.openPrs);
  if (entry.status === 'open') {
    handleOpenEntry(entry, pr, ctx);
  } else if (entry.status === 'pr-open') {
    handleInFlightEntry(cluster, entry, pr, ctx);
  } else if (entry.status === 'done') {
    handleDoneEntry(entry, ctx);
  }
};

const settleAbsentEntries = (seen, ctx) => {
  for (const [signature, entry] of Object.entries(ctx.state.signatures)) {
    if (seen.has(signature) || entry.status !== 'pr-open') {
      continue;
    }
    if (findPrForEntry(entry, ctx.openPrs)) {
      continue;
    }
    if (entry.taskId === undefined) {
      entry.status = 'done';
      continue;
    }
    const found = tasks.findTaskFile(ctx.root, entry.taskId);
    if (found?.status !== 'in-review') {
      continue;
    }
    tasks.moveTaskFile(ctx.root, entry.taskId, 'in-review', 'done');
    const moved = tasks.findTaskFile(ctx.root, entry.taskId);
    if (moved) {
      tasks.updateFrontMatter(moved.path, { status: 'done' });
    }
    entry.status = 'done';
  }
};

const printSummary = (clusters, logEntries, alarms, ctx) => {
  console.log(
    `Scanned ${clusters.length} error clusters (${logEntries.length} log matches, ${alarms.length} alarms in ALARM).`
  );
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

const collectClusters = async (region, days) => {
  const logEntries = await queryErrors({ region, days });
  const alarms = await listAlarmsInAlarm({ region });
  const clusters = [
    ...clusterBySignature(logEntries),
    ...alarms.map((alarm) => ({
      signature: alarmSignature(alarm),
      alarm,
      logGroup: alarm.dimensions.find((dimension) => dimension.startsWith('/aws/lambda/')) ?? '',
      occurrences: 1,
      samples: [`${alarm.name}: ${alarm.reason}`.slice(0, 2000)],
      lastTimestamp: null,
      source: 'alarm'
    }))
  ];
  return { clusters, logEntries, alarms };
};

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

  const { clusters, logEntries, alarms } = await collectClusters(region, args.days);
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
  printSummary(clusters, logEntries, alarms, ctx);

  if (args.dryRun) {
    console.log('\nDry run: nothing written, nothing committed, no dispatch.');
    return;
  }

  tasks.saveState(root, ctx.state);
  const message = `chore(error-scan): ${ctx.todayStr} — ${ctx.created.length} new, ${ctx.updated.length} updated, ${ctx.reopened.length} reopened`;
  if (!tasks.commitAndPush(root, message)) {
    console.log('No agent-tasks changes to commit.');
  }
  if (ctx.created.length > 0 && args.dispatch && usePrs) {
    prs.dispatchWorkflow('errorFix.yml');
    console.log('Dispatched errorFix workflow for new tasks.');
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
