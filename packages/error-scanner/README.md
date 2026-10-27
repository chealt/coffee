# error-scanner

Weekly AWS error triage: detect production errors in CloudWatch, turn them into task files,
and dispatch one fixing agent per task.

## How it works

Two workflows, coupled only by files in `agent-tasks/` and git:

1. **errorScan** (cron Mondays 06:00 UTC, or manual) — runs `src/scan.js`:
   - Lists CloudWatch alarms that entered `ALARM` state since the last successful scan
     (plus any still in `ALARM`).
   - For each fired alarm, queries the function's logs around the breach datapoints and
     clusters the matching errors by a normalized signature (log group + message + first
     stack frame). One alarm burst can yield several distinct tasks — an alarm covers a
     whole Lambda, the signatures separate the individual errors — and a recurring error
     reopens its existing task instead of creating a new one.
   - The scan window start (`state.lastScanAt`) advances only after a successful, non-dry
     run, so a failed scan never skips alarms.
   - Task ids are `<alarmName>-<signatureHash>` (e.g. `webshopItemProcessorErrors-e7d1ebc1`):
     the task file, branch, PR title, and state key all use it.
   - Dedupes against `agent-tasks/state.json` and open PRs:
     - task already open → bump counts
     - agent PR (`task/<alarm>` branch) in flight → mark `pr-open`, never recreate
     - new alarm + an open PR that may already fix it → an agent validates the PR diff against
       the alarm; if it fixes it, no task is created. Another task's PR counts here, since one
       root cause often raises several signatures. Unrelated PRs are screened by whether they
       touch files the error names; sibling `task/` PRs are always judged, because that kind of
       fix routinely lands in a file the error evidence never mentions
     - task in `in-review` → settled from the state of its `task/<id>` pull request, in any
       state, so a merged fix closes the task and an abandoned one reopens it
   - Commits new task files + state to `main` and dispatches **errorFix**.
2. **errorFix** (dispatched, or manual with/without an alarm name) — fans out one job per open
   task (`max-parallel: 2`). Each job checks out the repo, reuses branch `task/<alarm>` if it
   exists (long-running fixes are resumable), and runs a headless Claude Code agent that fixes,
   tests, moves the task file to `in-review/`, and opens a PR. Before starting the agent the job
   judges every other open `task/` PR against this task's brief, and skips the task when one of
   them already fixes it: the jobs in a wave cannot see each other, so without this check one
   root cause produces one near-identical PR per signature. The agent is told not to write
   tests.

Task lifecycle: `open/<id>.md` → (the agent's PR moves it) → `in-review/` → `done/` once that PR
merged, or back to `open/` when the PR was closed without merging, was never opened, or merged
while the error kept firing afterwards.

Every scan settles the in-review tasks from their pull request rather than from the alarm, because
the fix landing is exactly what stops the alarm firing again: waiting for another occurrence would
leave a finished task in `in-review` forever. A merged PR whose error only occurred before the
merge closes the task; errors timestamped after the merge reopen it as a regression. If the alarm
re-enters ALARM for a task already in `done`, the same file is reopened — incident history is not
kept.

Concurrency: `errorScan` has a workflow-level group (scans serialize); each fix job has a
per-task group `errorFix-<alarm>` with `cancel-in-progress` so a newer attempt supersedes a
stale one without duplicate agents on the same task.

## Setup

Both workflows run the agents through headless Claude Code (`claude --print`). The CLI is
installed by its own workflow step (`npm install -g @anthropic-ai/claude-code@2`) rather than as a
yarn devDependency: its binary is produced by an install script, and yarn 4 disables those by
default, so a workspace dependency would resolve to a missing binary.

Secrets (repository level):

- `CLAUDE_CODE_OAUTH_TOKEN` — a long-lived subscription token from `claude setup-token`, so CI
  agents bill against the same Claude subscription as local sessions. Replace it when it expires.
  An `ANTHROPIC_API_KEY` secret works instead if you would rather bill per token.
- AWS secrets are reused from the deploy workflows.

Optional repository variables (defaults match the setup above):

- `AGENT_MODEL` — model for the fix agent (default `claude-opus-5`).
- `AGENT_VERDICT_MODEL` — model for the scan's one-shot open-PR verdict (default `claude-sonnet-5`).

Optional environment overrides, unset in CI:

- `CLAUDE_BIN` — path to the `claude` binary.
- `AGENT_PERMISSION_MODE` — permission mode for the agents (default `bypassPermissions`, which is
  what makes an unattended run able to edit, commit and push).
- `AGENT_MAX_BUDGET_USD` — caps the estimated spend of a single agent run.

## Local usage

```bash
# dry run: prints what it would do, writes nothing
AWS_REGION=... yarn workspace @centralbeans/error-scanner scan --dry-run

# run one fix agent locally (no gh available: pushes the branch, you open the PR)
yarn workspace @centralbeans/error-scanner fix --task flagRemovedErrors
```

Local runs reuse your own `claude` login, so they need no token in the environment.

Run local fixes in a `git worktree` so agent branches don't interfere with your checkout. The fix
agent runs with permission prompts disabled, so it edits files and runs commands without asking.
