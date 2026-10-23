# error-scanner

Weekly AWS error triage: detect production errors in CloudWatch, turn them into task files,
and dispatch one fixing agent per task.

## How it works

Two workflows, coupled only by files in `agent-tasks/` and git:

1. **errorScan** (cron Mondays 06:00 UTC, or manual) — runs `src/scan.js`:
   - Lists CloudWatch alarms in `ALARM` state and turns each into a task
     (deduplicated by alarm signature).
   - Clusters errors by a normalized signature (log group + message + first stack frame,
     with timestamps/IDs/numbers stripped) so recurring errors stay one task.
   - Dedupes against `agent-tasks/state.json` and open PRs:
     - task already open → bump counts
     - agent PR (`task/<id>` branch) in flight → mark `pr-open`, never recreate
     - new error + an unrelated open PR touches related files → an agent validates the PR
       diff against the error; if it fixes it, no task is created
   - Commits new task files + state to `main` and dispatches **errorFix**.
2. **errorFix** (dispatched, or manual with/without a task id) — fans out one job per open
   task (`max-parallel: 2`). Each job checks out the repo, reuses branch `task/<id>` if it
   exists (long-running fixes are resumable), and runs a headless `pi` agent that fixes,
   tests, moves the task file to `in-review/`, and opens a PR.

Task lifecycle: `open/` → (agent PR moves it) → `in-review/` → (next scan confirms the
error is gone after merge) → `done/`. If an error reappears, the task is reopened.

Concurrency: `errorScan` has a workflow-level group (scans serialize); each fix job has a
per-task group `errorFix-<id>` with `cancel-in-progress` so a newer attempt supersedes a
stale one without duplicate agents on the same task.

## Setup

Secrets (repository level):

- `ZAI_API_KEY` — the key from `pi auth print-api-key --provider zai`, so CI agents use the
  same provider (`zai`) and model (`glm-5.3`) as local sessions.
- AWS secrets are reused from the deploy workflows.

Optional repository variables (defaults match the setup above):

- `AGENT_MODEL` — model for the agents (default `glm-5.3`).
- `PI_PROVIDER` — provider (default `zai`).

## Local usage

```bash
# dry run: prints what it would do, writes nothing
AWS_REGION=... yarn workspace @centralbeans/error-scanner scan --dry-run

# run one fix agent locally (no gh available: pushes the branch, you open the PR)
ZAI_API_KEY=... yarn workspace @centralbeans/error-scanner fix --task 0007
```

Run local fixes in a `git worktree` so agent branches don't interfere with your checkout.
