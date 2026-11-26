// Packaging test: build the real npm tarball, unpack it somewhere else and run the installer from it, the way
// `npx neuraforge-ai` does. Catches files missing from package.json "files" (for example an imported module).
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, existsSync, readFileSync, mkdirSync, writeFileSync, readdirSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const work = mkdtempSync(join(tmpdir(), 'nf-pack-'));
const IS_WIN = process.platform === 'win32';

function npmPack() {
  // Run as `npm publish --dry-run`, npm exports npm_config_dry_run; the test needs a real tarball, so override it.
  const env = { ...process.env, npm_config_dry_run: 'false' };
  const out = execFileSync(IS_WIN ? 'npm.cmd' : 'npm', ['pack', '--json', '--pack-destination', work], { cwd: ROOT, encoding: 'utf8', shell: IS_WIN, env });
  return JSON.parse(out.slice(out.indexOf('[')))[0];
}

const packed = npmPack();
execFileSync('tar', ['-xzf', join(work, packed.filename), '-C', work]);
const PKG = join(work, 'package');
const names = new Set(packed.files.map((f) => f.path));

function project() {
  const dir = mkdtempSync(join(tmpdir(), 'nf-proj-'));
  return dir;
}
const install = (dir, ...args) => spawnSync(process.execPath, [join(PKG, 'install.mjs'), ...args], { cwd: dir, encoding: 'utf8', env: { ...process.env, NEURAFORGE_SRC: '' } });

test('tarball contains everything install.mjs imports or copies', () => {
  for (const f of ['install.mjs', 'install.sh', 'package.json', 'AGENTS.md', 'GEMINI.md', '.mcp.json', 'tools/install/adapters.mjs', 'tools/verify/post-gen-check.mjs', 'tools/feedback/index.mjs', '.neuraforge/feedback/TEMPLATE.md', '.cursor/mcp.json', '.gemini/settings.json', 'rules/core/CODEGEN_CORE.md', 'skills/dotnet-forge/references/code-patterns.md', 'agents/forge.md', 'agents/forge.json']) {
    assert.ok(names.has(f), `missing from the package: ${f}`);
  }
  assert.ok(![...names].some((f) => f.startsWith('tools/eval') || f.startsWith('.github') || f.includes('node_modules')), 'dev-only files must not ship');
});

test('installer runs from the unpacked package and writes each tool layout (no network, no git)', () => {
  for (const [platform, expect] of [
    ['claude', ['.claude/agents/forge.md', '.claude/skills/dotnet-forge/SKILL.md', 'CLAUDE.md']],
    ['kiro', ['.kiro/agents/forge.json', '.kiro/skills/dotnet-forge/SKILL.md', '.kiro/steering']],
    ['gemini', ['.gemini/agents/forge.md', '.agents/skills/dotnet-forge/SKILL.md', 'GEMINI.md']],
    ['codex', ['.codex/agents/forge.toml', '.codex/config.toml', '.agents/skills/dotnet-forge/SKILL.md']],
    ['antigravity', ['.agents/skills/dotnet-forge/SKILL.md', '.agents/mcp_config.json']],
    ['cursor', ['.cursor/mcp.json', 'AGENTS.md']],
  ]) {
    const dir = project();
    const r = install(dir, platform);
    assert.equal(r.status, 0, `${platform}: ${r.stderr || r.stdout}`);
    assert.match(r.stdout, /Installing bundled version/);
    for (const rel of expect) assert.ok(existsSync(join(dir, rel)), `${platform}: missing ${rel}`);
    assert.ok(existsSync(join(dir, '.neuraforge/tools/post-gen-check.mjs')), `${platform}: post-gen-check not installed`);
  }
});

test('--version, --help and dry-run work from the package', () => {
  const dir = project();
  assert.equal(install(dir, '--version').stdout.trim(), JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).version);
  assert.match(install(dir, '--help').stdout, /npx neuraforge-ai verify/);
  const dry = install(dir, 'claude', '--dry-run');
  assert.equal(dry.status, 0);
  assert.equal(readdirSync(dir).length, 0, 'dry run must not write files');
});

test('verify subcommand runs the bundled secret scan in the current project', () => {
  const dir = project();
  const g = (...a) => execFileSync('git', a, { cwd: dir, stdio: 'ignore' });
  g('init', '-q'); g('config', 'user.email', 't@t'); g('config', 'user.name', 't');
  writeFileSync(join(dir, 'a.txt'), 'x\n'); g('add', '-A'); g('commit', '-qm', 'i');
  const clean = install(dir, 'verify');
  assert.equal(clean.status, 0, clean.stderr);
  assert.match(clean.stdout, /Secrets: none/);
  mkdirSync(join(dir, 'src'));
  writeFileSync(join(dir, 'src', 'k.ts'), 'export const k = "AKIAABCDEFGHIJKLMNOP";\n'); // post-gen-check:allow
  const dirty = install(dir, 'verify');
  assert.equal(dirty.status, 1);
  assert.match(dirty.stdout, /src\/k\.ts:1/);
  assert.ok(!dirty.stdout.includes('AKIAABCDEF'), 'the secret value must not be printed');
});
