/**
 * Grader for behavior evals. Pure and offline: given a working directory (what the agent produced) and the agent's
 * reply text, evaluate a list of deterministic checks. No model is involved in grading, so results are repeatable.
 *
 * Check types:
 *   file_exists   { glob }                       at least one file matches
 *   matches       { glob, pattern, flags?, min? } pattern appears in at least `min` (default 1) matching files
 *   not_matches   { glob, pattern, flags? }      pattern appears in no matching file
 *   unchanged     { path }                       file still has the content the case seeded (agent must not edit it)
 *   command       { cmd, exit? }                 run in the workdir, expect exit code (default 0)
 *   reply_matches / reply_not_matches { pattern, flags? }   test the agent's final reply
 */
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { spawnSync } from 'node:child_process';

const IGNORE_DIRS = new Set(['.git', 'node_modules', '.claude', '.kiro', '.codex', '.gemini', '.agents', 'agents', 'skills', 'rules', '.neuraforge', 'bin', 'obj']);

export function walk(dir, base = dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (IGNORE_DIRS.has(name)) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, base, out);
    else out.push(relative(base, p).split(sep).join('/'));
  }
  return out;
}

// Small glob: ** any depth, * within a segment, ? one char.
export function globToRegExp(glob) {
  const re = glob
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*\//g, '\u0000')
    .replace(/\*\*/g, '\u0001')
    .replace(/\*/g, '[^/]*')
    .replace(/\?/g, '[^/]')
    .replace(/\u0000/g, '(?:.*/)?')
    .replace(/\u0001/g, '.*');
  return new RegExp(`^${re}$`);
}

export function grade({ dir, reply = '', checks, seed = {} }) {
  const files = walk(dir);
  const results = [];
  const read = (f) => readFileSync(join(dir, f), 'utf8');
  for (const c of checks) {
    let ok = false;
    let detail = '';
    const re = c.pattern ? new RegExp(c.pattern, c.flags ?? 'm') : null;
    const matched = c.glob ? files.filter((f) => globToRegExp(c.glob).test(f)) : [];
    switch (c.type) {
      case 'file_exists':
        ok = matched.length > 0;
        detail = ok ? matched.slice(0, 3).join(', ') : `no file matches ${c.glob}`;
        break;
      case 'matches': {
        const hits = matched.filter((f) => re.test(read(f)));
        ok = hits.length >= (c.min ?? 1);
        detail = ok ? `${hits.length} file(s)` : matched.length ? `pattern not found in ${matched.length} file(s)` : `no file matches ${c.glob}`;
        break;
      }
      case 'not_matches': {
        const hits = matched.filter((f) => re.test(read(f)));
        ok = hits.length === 0;
        detail = ok ? `${matched.length} file(s) clean` : `forbidden pattern in ${hits.slice(0, 3).join(', ')}`;
        break;
      }
      case 'unchanged':
        ok = existsSync(join(dir, c.path)) && c.path in seed && read(c.path) === seed[c.path];
        detail = ok ? 'unchanged' : `${c.path} was modified or removed`;
        break;
      case 'command': {
        const r = spawnSync('sh', ['-c', c.cmd], { cwd: dir, encoding: 'utf8', timeout: (c.timeoutSec ?? 120) * 1000 });
        ok = r.status === (c.exit ?? 0);
        detail = ok ? `exit ${r.status}` : `exit ${r.status}: ${(r.stdout + r.stderr).split('\n').slice(-6).join(' | ').slice(0, 300)}`;
        break;
      }
      case 'reply_matches':
        ok = re.test(reply);
        detail = ok ? 'found in reply' : 'not found in reply';
        break;
      case 'reply_not_matches':
        ok = !re.test(reply);
        detail = ok ? 'absent from reply' : 'forbidden text in reply';
        break;
      default:
        detail = `unknown check type ${c.type}`;
    }
    results.push({ id: c.id ?? c.type, why: c.why ?? '', type: c.type, ok, detail });
  }
  return { passed: results.every((r) => r.ok), results };
}
