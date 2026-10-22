import { spawn } from 'node:child_process';

const runPi = ({ prompt, stdin, model, provider, cwd, timeoutMinutes = 80 }) =>
  new Promise((resolve, reject) => {
    const bin = process.env.PI_BIN || 'pi';
    const args = ['--print', '--model', model, prompt];
    if (provider) {
      args.push('--provider', provider);
    }
    const child = spawn(bin, args, { cwd });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(
      () => {
        child.kill('SIGTERM');
        reject(new Error(`pi timed out after ${timeoutMinutes} minutes`));
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
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(`pi exited with code ${code}: ${stderr.slice(-2000)}`));
      }
    });
    child.stdin.end(stdin ?? '');
  });

const extractJson = (text) => {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidates = [fenced?.[1], text].filter(Boolean);
  for (const candidate of candidates) {
    const start = candidate.indexOf('{');
    const end = candidate.lastIndexOf('}');
    if (start === -1 || end <= start) {
      continue;
    }
    try {
      return JSON.parse(candidate.slice(start, end + 1));
    } catch {
      // try next candidate
    }
  }
  return undefined;
};

export { extractJson, runPi };
