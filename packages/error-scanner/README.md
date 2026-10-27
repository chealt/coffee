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
     - new alarm + an unrelated open PR touches related files → an agent validates the PR
       diff against the alarm; if it fixes it, no task is created
   - Commits new task files + state to `main` and dispatches **errorFix**.
2. **errorFix** (dispatched, or manual with/without an alarm name) — fans out one job per open
   task (`max-parallel: 2`). Each job checks out the repo, reuses branch `task/<alarm>` if it
   exists (long-running fixes are resumable), and runs a headless Claude Code agent that fixes,
   tests, moves the task file to `in-review/`, and opens a PR.

Task lifecycle: `open/<alarm>.md` → (agent PR moves it) → `in-review/` → (next scan confirms the
alarm cleared after merge) → `done/`. If the alarm re-enters ALARM, the same task file is
reopened — incident history is not kept.

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
