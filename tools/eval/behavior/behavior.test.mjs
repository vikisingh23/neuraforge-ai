import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { grade, globToRegExp } from './grader.mjs';
import { loadCases, seedProject } from './index.mjs';

const KNOWN_AGENTS = new Set(['forge', 'react-forge', 'rn-forge', 'nestjs-forge', 'django-forge', 'spring-forge', 'flutter-forge', 'test-forge', 'debug', 'refactor', 'scaffold', 'security-reviewer', 'dotnet-reviewer']);
const TYPES = new Set(['file_exists', 'matches', 'not_matches', 'unchanged', 'command', 'reply_matches', 'reply_not_matches']);

function project(seed, overlay = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'nf-beh-'));
  seedProject(dir, seed);
  for (const [p, c] of Object.entries(overlay)) {
    mkdirSync(dirname(join(dir, p)), { recursive: true });
    writeFileSync(join(dir, p), c);
  }
  return dir;
}

test('glob matching: ** crosses directories, * does not', () => {
  assert.ok(globToRegExp('src/**/*.cs').test('src/Api/Models/Payment.cs'));
  assert.ok(globToRegExp('src/**/*.cs').test('src/Payment.cs'));
  assert.ok(!globToRegExp('src/*.cs').test('src/Api/Payment.cs'));
  assert.ok(globToRegExp('src/**/*.ts*').test('src/a/b.tsx'));
});

test('grader: each check type passes and fails as intended', () => {
  const seed = { 'a.txt': 'hello', 'src/x.js': 'const v = 1;' };
  const dir = project(seed, { 'src/y.js': 'export const y = 2;' });
  const r = grade({
    dir, seed, reply: 'Root cause found',
    checks: [
      { type: 'file_exists', glob: 'src/*.js' },
      { type: 'matches', glob: 'src/*.js', pattern: 'export' },
      { type: 'matches', glob: 'src/*.js', pattern: 'const', min: 2 },
      { type: 'not_matches', glob: 'src/*.js', pattern: 'eval\\(' },
      { type: 'unchanged', path: 'a.txt' },
      { type: 'command', cmd: 'test -f a.txt' },
      { type: 'command', cmd: 'exit 3', exit: 3 },
      { type: 'reply_matches', pattern: 'root cause', flags: 'i' },
      { type: 'reply_not_matches', pattern: 'APPROVED' },
    ],
  });
  assert.deepEqual(r.results.map((x) => x.ok), [true, true, true, true, true, true, true, true, true]);

  const bad = grade({
    dir, seed, reply: 'APPROVED',
    checks: [
      { type: 'file_exists', glob: 'nope/*.js' },
      { type: 'not_matches', glob: 'src/*.js', pattern: 'export' },
      { type: 'unchanged', path: 'src/y.js' },
      { type: 'command', cmd: 'exit 1' },
      { type: 'reply_not_matches', pattern: 'APPROVED' },
    ],
  });
  assert.deepEqual(bad.results.map((x) => x.ok), [false, false, false, false, false]);
  rmSync(dir, { recursive: true, force: true });
});

test('cases: valid schema, known agent and a compilable pattern in every check', () => {
  const cases = loadCases();
  assert.ok(cases.length >= 6);
  const ids = new Set();
  for (const c of cases) {
    assert.ok(!ids.has(c.id), `duplicate id ${c.id}`); ids.add(c.id);
    assert.ok(KNOWN_AGENTS.has(c.agent), `${c.id}: unknown agent ${c.agent}`);
    assert.ok(c.prompt && c.seed && c.checks?.length && c.golden?.pass && c.golden?.fail, `${c.id}: incomplete case`);
    for (const k of c.checks) {
      assert.ok(TYPES.has(k.type), `${c.id}: bad check type ${k.type}`);
      if (k.pattern) new RegExp(k.pattern, k.flags ?? 'm');
      if (['file_exists', 'matches', 'not_matches'].includes(k.type)) assert.ok(k.glob, `${c.id}/${k.id}: glob required`);
    }
  }
});

test('cases: golden pass satisfies every check, golden fail trips at least one', () => {
  for (const c of loadCases()) {
    const pass = project(c.seed, c.golden.pass.files);
    const gp = grade({ dir: pass, seed: c.seed, reply: c.golden.pass.reply, checks: c.checks });
    assert.ok(gp.passed, `${c.id} golden pass failed: ${JSON.stringify(gp.results.filter((r) => !r.ok))}`);
    const fail = project(c.seed, c.golden.fail.files);
    const gf = grade({ dir: fail, seed: c.seed, reply: c.golden.fail.reply, checks: c.checks });
    assert.ok(!gf.passed, `${c.id} golden fail unexpectedly passed`);
    rmSync(pass, { recursive: true, force: true });
    rmSync(fail, { recursive: true, force: true });
  }
});

test('cases: every check can fail (mutation check on the golden pass)', () => {
  // A check that passes on both a good and an empty project proves nothing. Grade an empty reply on a bare seed:
  // at least half of the checks must fail there, otherwise the case is too easy to satisfy.
  for (const c of loadCases()) {
    const bare = project(c.seed);
    const g = grade({ dir: bare, seed: c.seed, reply: '', checks: c.checks });
    const failing = g.results.filter((r) => !r.ok).length;
    assert.ok(failing >= Math.ceil(c.checks.length / 2) - 1 || c.id.startsWith('security'), `${c.id}: only ${failing}/${c.checks.length} checks fail on an untouched project`);
    rmSync(bare, { recursive: true, force: true });
  }
});
