import { execFileSync } from 'node:child_process';

const hasGh = () => {
  try {
    execFileSync('gh', ['--version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
};

const gh = (args, options = {}) =>
  execFileSync('gh', args, { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, ...options }).trim();

const listOpenPrs = () => gh(['pr', 'list', '--state', 'open', '--json', 'number,title,headRefName,url']);

const parseOpenPrs = (output) => JSON.parse(output || '[]');

const prDiff = (number) => gh(['pr', 'diff', String(number)]);

const prChangedFiles = (number) =>
  gh(['pr', 'diff', String(number), '--name-only'])
    .split('\n')
    .filter(Boolean);

const prState = (number) => gh(['pr', 'view', String(number), '--json', 'state,mergedAt,url']);

const prForBranch = (openPrs, branch) => openPrs.find((pr) => pr.headRefName === branch);

const dispatchWorkflow = (workflow) => {
  gh(['workflow', 'run', workflow]);
};

export { dispatchWorkflow, hasGh, listOpenPrs, parseOpenPrs, prChangedFiles, prDiff, prForBranch, prState };
