#!/usr/bin/env node
/**
 * NeuraForge behavior evals (tier 2).
 *
 * Tier 1 (`npm run eval`) checks golden example files. It cannot tell whether an agent still behaves well after a prompt
 * change. Tier 2 runs a real agent on a small task in a throwaway project and grades what it produced with deterministic
 * checks (see grader.mjs). It needs a signed-in agent CLI, so it is run on demand, not in CI. CI runs the grader tests and
 * validates every case, including its golden pass and fail examples.
 *
 * Usage:
 *   node tools/eval/behavior/index.mjs --list
 *   node tools/eval/behavior/index.mjs --agent forge [--case id] [--model sonnet] [--keep]
 *   node tools/eval/behavior/index.mjs --cmd 'codex exec "$NF_PROMPT"'      other tools (env: NF_PROMPT, NF_AGENT)
 *   node tools/eval/behavior/index.mjs --grade <dir> --case <id> [--reply-file f]   grade a directory you produced yourself
 *   add --json for machine-readable output, --keep to keep the project (reply saved as .nf-reply.txt), --show-reply to print the reply
 */
import { readdirSync, readFileSync, mkdirSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { grade } from './grader.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');
const CASES = join(HERE, 'cases');

export function loadCases() {
  return readdirSync(CASES).filter((f) => f.endsWith('.json')).sort().map((f) => ({ file: f, ...JSON.parse(readFileSync(join(CASES, f), 'utf8')) }));
}

export function seedProject(dir, files = {}) {
  for (const [p, content] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, p)), { recursive: true });
    writeFileSync(join(dir, p), content);
  }
}

function sh(cmd, args, cwd, env = {}, timeoutMs = 900000) {
  return spawnSync(cmd, args, { cwd, env: { ...process.env, ...env }, encoding: 'utf8', timeout: timeoutMs, maxBuffer: 64 * 1024 * 1024 });
}

function runCase(c, opts) {
  const dir = mkdtempSync(join(tmpdir(), `nf-eval-${c.id}-`));
  seedProject(dir, c.seed);
  sh('git', ['init', '-q'], dir);
  sh('git', ['-c', 'user.email=eval@local', '-c', 'user.name=eval', 'add', '-A'], dir);
  sh('git', ['-c', 'user.email=eval@local', '-c', 'user.name=eval', 'commit', '-qm', 'seed'], dir);
  const inst = sh('node', [join(ROOT, 'install.mjs'), opts.platform ?? 'claude'], dir, { NEURAFORGE_SRC: ROOT });
  if (inst.status !== 0) return { dir, error: `install failed: ${inst.stderr || inst.stdout}`.slice(0, 400) };

  let reply = '';
  if (opts.cmd) {
    const r = sh('sh', ['-c', opts.cmd], dir, { NF_PROMPT: c.prompt, NF_AGENT: c.agent }, (c.timeoutSec ?? 900) * 1000);
    reply = (r.stdout || '') + (r.stderr || '');
  } else {
    const args = ['-p', c.prompt, '--agent', c.agent, '--permission-mode', 'acceptEdits', '--allowedTools', 'Read,Write,Edit,Grep,Glob,Bash', '--max-turns', String(c.maxTurns ?? 25), '--output-format', 'json'];
    if (opts.model) args.push('--model', opts.model);
    const r = sh('claude', args, dir, {}, (c.timeoutSec ?? 900) * 1000);
    if (r.error || r.status !== 0) return { dir, error: `claude failed (${r.error?.message ?? 'exit ' + r.status}): ${(r.stdout || r.stderr || '').slice(0, 300)}` };
    try { reply = JSON.parse(r.stdout).result ?? ''; } catch { reply = r.stdout; }
  }
  const infra = reply.match(/InvalidModelError|model '[^']+' is not available|Failed to authenticate|OAuth session expired|not logged in|Please (log|sign) ?in/i);
  if (infra) return { dir, error: `agent CLI could not run (${infra[0]}): ${reply.replace(/\s+/g, ' ').slice(0, 200)}` };
  return { dir, reply };
}

function main() {
  const argv = process.argv.slice(2);
  const get = (k) => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : null);
  const json = argv.includes('--json');
  const cases = loadCases();
  if (argv.includes('--list')) {
    for (const c of cases) console.log(`${c.id.padEnd(22)} ${c.agent.padEnd(18)} ${c.description}`);
    return 0;
  }
  const agent = get('--agent');
  const only = get('--case');
  const gradeDir = get('--grade');
  let selected = cases.filter((c) => (!agent || c.agent === agent) && (!only || c.id === only));
  if (!selected.length) { console.error('No matching cases. Use --list.'); return 2; }

  const report = [];
  for (const c of selected) {
    if (gradeDir) {
      const replyFile = get('--reply-file');
      const g = grade({ dir: gradeDir, reply: replyFile ? readFileSync(replyFile, 'utf8') : '', checks: c.checks, seed: c.seed });
      report.push({ id: c.id, agent: c.agent, ...g });
      continue;
    }
    const run = runCase(c, { model: get('--model'), cmd: get('--cmd'), platform: get('--platform') });
    if (run.error) { report.push({ id: c.id, agent: c.agent, passed: false, error: run.error, results: [] }); continue; }
    const g = grade({ dir: run.dir, reply: run.reply, checks: c.checks, seed: c.seed });
    if (argv.includes('--keep')) writeFileSync(join(run.dir, '.nf-reply.txt'), run.reply);
    report.push({ id: c.id, agent: c.agent, workdir: argv.includes('--keep') ? run.dir : undefined, reply: argv.includes('--show-reply') ? run.reply : undefined, ...g });
    if (!argv.includes('--keep')) rmSync(run.dir, { recursive: true, force: true });
  }

  if (json) console.log(JSON.stringify(report, null, 2));
  else {
    for (const r of report) {
      console.log(`${r.passed ? 'PASS' : 'FAIL'}  ${r.id}  (${r.agent})${r.error ? '  ' + r.error : ''}${r.workdir ? '  workdir: ' + r.workdir : ''}`);
      if (r.reply !== undefined) console.log('--- reply ---\n' + r.reply.slice(-3000) + '\n--- end reply ---');
      for (const x of r.results) if (!x.ok || argv.includes('--verbose')) console.log(`   ${x.ok ? 'ok  ' : 'FAIL'} ${x.id}${x.why ? ' - ' + x.why : ''}: ${x.detail}`);
    }
    const p = report.filter((r) => r.passed).length;
    console.log(`\n${p}/${report.length} cases passed`);
  }
  return report.every((r) => r.passed) ? 0 : 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) process.exit(main());
