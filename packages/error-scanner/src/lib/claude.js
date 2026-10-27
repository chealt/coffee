import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Keeps Claude Code from adding a Co-Authored-By trailer to agent commits.
const settingsPath = fileURLToPath(new URL('../../agent-settings.json', import.meta.url));

const runClaude = ({ prompt, stdin, model, cwd, timeoutMinutes = 80, jsonSchema, noTools = false }) =>
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
      settingsPath,
      '--output-format',
      'json'
    ];
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
    const child = spawn(bin, args, { cwd });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(
      () => {
        child.kill('SIGTERM');
        reject(new Error(`claude timed out after ${timeoutMinutes} minutes`));
      },
      timeoutMinutes * 60 * 1000
    );
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        reject(new Error(`claude exited with code ${code}: ${(stderr || stdout).slice(-2000)}`));
        return;
      }
      let payload;
      try {
        payload = JSON.parse(stdout);
      } catch {
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
