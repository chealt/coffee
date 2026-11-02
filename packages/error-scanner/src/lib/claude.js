import { spawn } from 'node:child_process';

// Keeps Claude Code from adding a Co-Authored-By trailer to agent commits. Passed inline
// rather than as a repo file: an agent resuming an older task branch checks out a tree that
// predates any file the harness itself needs, and the run dies before it starts.
const SETTINGS = JSON.stringify({ attribution: { commit: '', pr: '' } });

const KILL_GRACE_MS = 5 * 1000;
const LOG_LINE_LIMIT = 300;

const clip = (text) => text.replace(/\s+/g, ' ').trim().slice(0, LOG_LINE_LIMIT);

const toolDetail = (input = {}) => input.command ?? input.file_path ?? input.pattern ?? input.description ?? '';

const logBlock = (block) => {
  if (block.type === 'text') {
    console.log(`[agent] ${clip(block.text)}`);
  } else if (block.type === 'tool_use') {
    console.log(`[agent] ${block.name}: ${clip(String(toolDetail(block.input)))}`);
  } else if (block.type === 'tool_result' && block.is_error) {
    console.log(`[agent] tool error: ${clip(JSON.stringify(block.content))}`);
  }
};

const parseLine = (line) => {
  try {
    return JSON.parse(line);
  } catch {
    return undefined;
  }
};

const logEvent = (line) => {
  const content = parseLine(line)?.message?.content;
  if (Array.isArray(content)) {
    content.forEach(logBlock);
  }
};

const parsePayload = (stdout, stream) =>
  stream
    ? stdout
        .split('\n')
        .map(parseLine)
        .findLast((event) => event?.type === 'result')
    : parseLine(stdout);

// stream prints the agent's progress as it works, so a run killed at its deadline still shows
// how far it got. The json format only reports once the run has finished.
const runClaude = ({ prompt, stdin, model, cwd, timeoutMinutes = 80, jsonSchema, noTools = false, stream = false }) =>
  new Promise((resolve, reject) => {
    const bin = process.env.CLAUDE_BIN || 'claude';
    // A --print run starts in manual mode, where every edit, command and push the agent
    // needs would be denied with nobody around to approve it.
    const args = [
      '--print',
      '--model',
      model,
      '--permission-mode',
      process.env.AGENT_PERMISSION_MODE || 'bypassPermissions',
      '--permission-prompts',
      'none',
      '--settings',
      SETTINGS,
      '--output-format',
      stream ? 'stream-json' : 'json'
    ];
    if (stream) {
      args.push('--verbose');
    }
    if (process.env.AGENT_MAX_BUDGET_USD) {
      args.push('--max-budget-usd', process.env.AGENT_MAX_BUDGET_USD);
    }
    if (noTools) {
      // The inline `--tools=` form matters: `--tools ''` is variadic and swallows the prompt.
      args.push('--tools=', '--strict-mcp-config');
    }
    if (jsonSchema) {
      args.push('--json-schema', JSON.stringify(jsonSchema));
    }
    args.push(prompt);
    // detached makes the child a process group leader, so a timeout can signal the agent's
    // whole tree. Killing just the agent leaves its commands running, and a survivor holding
    // the output pipes means the close event never arrives.
    const child = spawn(bin, args, { cwd, detached: true });
    let stdout = '';
    let stderr = '';
    let unfinishedLine = '';
    let timedOut = false;
    let killTimer;
    const signalTree = (signal) => {
      try {
        process.kill(-child.pid, signal);
      } catch {
        child.kill(signal);
      }
    };
    // On the deadline the agent gets SIGTERM and a short grace to shut down, which is the
    // path Claude Code takes. An agent still alive after it is killed outright and the run is
    // failed from here, because a survivor holding the output pipes means no close event ever
    // arrives. Either way the run ends within the grace period of its budget.
    const failTimedOut = () => reject(new Error(`claude timed out after ${timeoutMinutes.toFixed(1)} minutes`));
    const timer = setTimeout(
      () => {
        timedOut = true;
        signalTree('SIGTERM');
        killTimer = setTimeout(() => {
          signalTree('SIGKILL');
          failTimedOut();
        }, KILL_GRACE_MS);
      },
      timeoutMinutes * 60 * 1000
    );
    const stopTimers = () => {
      clearTimeout(timer);
      clearTimeout(killTimer);
    };
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
      if (stream) {
        const lines = (unfinishedLine + chunk).split('\n');
        unfinishedLine = lines.pop();
        lines.forEach(logEvent);
      }
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('error', (error) => {
      stopTimers();
      reject(error);
    });
    child.on('close', (code) => {
      stopTimers();
      if (timedOut) {
        failTimedOut();
        return;
      }
      if (code !== 0) {
        reject(new Error(`claude exited with code ${code}: ${(stderr || stdout).slice(-2000)}`));
        return;
      }
      const payload = parsePayload(stdout, stream);
      if (!payload) {
        reject(new Error(`claude returned unparseable output: ${stdout.slice(-2000)}`));
        return;
      }
      if (payload.is_error) {
        reject(new Error(`claude reported a failed run: ${String(payload.result).slice(-2000)}`));
        return;
      }
      resolve(payload);
    });
    child.stdin.end(stdin ?? '');
  });

const logUsage = (label, payload) => {
  const cost = typeof payload.total_cost_usd === 'number' ? `$${payload.total_cost_usd.toFixed(2)}` : 'unknown';
  console.log(`${label}: ${payload.num_turns ?? '?'} turns, ${cost} estimated cost.`);
};

export { logUsage, runClaude };
