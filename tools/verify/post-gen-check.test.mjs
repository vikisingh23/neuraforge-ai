import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { scanSecrets, diffDeps, parseManifest, run } from './post-gen-check.mjs';

const diff = (file, lines) => `diff --git a/${file} b/${file}\n--- a/${file}\n+++ b/${file}\n@@ -0,0 +1,${lines.length} @@\n${lines.map((l) => '+' + l).join('\n')}\n`;

test('detects real secret shapes and reports line numbers without the value', () => {
  const hits = scanSecrets(diff('src/a.ts', ['const ok = 1;', 'const key = "AKIAABCDEFGHIJKLMNOP";', 'const t = "glpat-abcdefghijklmnopqrstu";'])); // post-gen-check:allow
  assert.deepEqual(hits.map((h) => [h.file, h.line, h.kind]), [['src/a.ts', 2, 'AWS access key'], ['src/a.ts', 3, 'GitLab token']]);
  assert.ok(!JSON.stringify(hits).includes('AKIAABCDEF'));
});

test('ignores placeholders, env references and removed lines', () => {
  const hits = scanSecrets(diff('a.env', ['password = "${DB_PASSWORD}"', 'token = "your-token-here"', 'API_KEY = process.env.KEY']) + '-secret = "realvalue123"\n');
  assert.equal(hits.length, 0);
});

test('flags a hard-coded credential assignment', () => {
  assert.equal(scanSecrets(diff('c.cs', ['var password = "Sup3rS3cretValue";'])).length, 1); // post-gen-check:allow
});

test('diffDeps reports new and changed, and marks unpinned versions', () => {
  const d = diffDeps({ a: '1.0.0', b: '2.0.0' }, { a: '1.0.0', b: '2.1.0', c: '^3.0.0', d: '4.0.0' });
  assert.deepEqual(d.map((x) => [x.name, x.unpinned]), [['b', false], ['c', true], ['d', false]]);
});

test('manifest parsers: package.json, csproj, requirements, pubspec', () => {
  assert.deepEqual(parseManifest('package.json', '{"dependencies":{"x":"1.0.0"},"devDependencies":{"y":"^2"}}'), { x: '1.0.0', y: '^2' });
  assert.deepEqual(parseManifest('A.csproj', '<PackageReference Include="Serilog" Version="4.0.0" />'), { Serilog: '4.0.0' });
  assert.deepEqual(parseManifest('requirements.txt', 'django==5.0.1\nrequests>=2.0\n# c'), { django: '5.0.1', requests: '>=2.0' });
  assert.deepEqual(parseManifest('pubspec.yaml', 'dependencies:\n  flutter:\n    sdk: flutter\n  dio: ^5.0.0\n'), { flutter: '(complex)', dio: '^5.0.0' });
});

test('run() on a real repo: clean change passes, secret and unpinned dependency are reported', () => {
  const dir = mkdtempSync(join(tmpdir(), 'pgc-'));
  const g = (...a) => execFileSync('git', a, { cwd: dir, stdio: 'ignore' });
  g('init', '-q'); g('config', 'user.email', 't@t'); g('config', 'user.name', 't');
  writeFileSync(join(dir, 'package.json'), '{"dependencies":{"a":"1.0.0"}}');
  g('add', '-A'); g('commit', '-qm', 'init');
  let r = run({ cwd: dir });
  assert.equal(r.exit, 0);
  assert.equal(r.secrets.length, 0);

  writeFileSync(join(dir, 'package.json'), '{"dependencies":{"a":"1.0.0","b":"^2.0.0"}}');
  mkdirSync(join(dir, 'src'));
  writeFileSync(join(dir, 'src', 'cfg.ts'), 'export const k = "AKIAABCDEFGHIJKLMNOP";\n'); // post-gen-check:allow
  r = run({ cwd: dir });
  assert.equal(r.exit, 1);
  assert.equal(r.secrets[0].file, 'src/cfg.ts');
  assert.deepEqual(r.deps.map((d) => [d.name, d.unpinned]), [['b', true]]);
  assert.equal(run({ cwd: dir, strict: true }).exit, 1);
});
