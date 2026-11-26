#!/usr/bin/env node
/**
 * post-gen-check: run after an agent generates code.
 *
 *   1. Secret scan of every added line in the working tree (tracked changes + untracked files).
 *      Reports file:line and the kind of secret. Never prints the value. Exit 1 when anything is found.
 *   2. Dependency report: packages added or changed in package.json, *.csproj, requirements*.txt, pubspec.yaml, pom.xml,
 *      with a warning for unpinned versions (^, ~, *, latest). With --strict, unpinned versions also exit 1.
 *   3. --audit also runs the ecosystem's vulnerability check when its tooling and lock file exist
 *      (npm audit, dotnet list package --vulnerable). Failures are reported, not fatal, unless --strict.
 *
 * Usage: node tools/verify/post-gen-check.mjs [--strict] [--audit] [--json]
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SECRET_PATTERNS = [
  ['AWS access key', /AKIA[0-9A-Z]{16}/],
  ['GitLab token', /glpat-[A-Za-z0-9_-]{16,}/],
  ['Figma token', /figd_[A-Za-z0-9_-]{20,}/],
  ['GitHub token', /gh[pousr]_[A-Za-z0-9]{30,}/],
  ['Slack token', /xox[baprs]-[A-Za-z0-9-]{10,}/],
  ['Private key', /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ['Hard-coded credential', /(password|passwd|secret|token|api[_-]?key)\s*[:=]\s*["'][^"'<$\s{][^"']{7,}["']/i],
];
// A line containing `post-gen-check:allow` is skipped (for test fixtures that contain fake secrets).
const PLACEHOLDER = /(post-gen-check:allow|example|sample|changeme|placeholder|your[-_ ]|xxxx|\*{4}|<[^>]+>|process\.env|\$\{|env\()/i;

/** Scan unified-diff text. Returns [{ file, line, kind }] for added lines only. */
export function scanSecrets(diffText) {
  const hits = [];
  let file = null;
  let line = 0;
  for (const raw of diffText.split('\n')) {
    if (raw.startsWith('+++ ')) { file = raw.slice(4).replace(/^b\//, ''); continue; }
    const m = raw.match(/^@@ -\d+(?:,\d+)? \+(\d+)/);
    if (m) { line = Number(m[1]) - 1; continue; }
    if (raw.startsWith('+') && !raw.startsWith('+++')) {
      line++;
      const text = raw.slice(1);
      if (PLACEHOLDER.test(text)) continue;
      for (const [kind, re] of SECRET_PATTERNS) if (re.test(text)) { hits.push({ file, line, kind }); break; }
    } else if (!raw.startsWith('-')) line++;
  }
  return hits;
}

const UNPINNED = /^(\^|~|\*|latest|>=?|<=?|x$)/i;

/** Compare dependency maps ({name: version}). Returns [{ name, from, to, unpinned }]. */
export function diffDeps(before = {}, after = {}) {
  const out = [];
  for (const [name, to] of Object.entries(after)) {
    const from = before[name];
    if (from !== to) out.push({ name, from: from ?? null, to, unpinned: UNPINNED.test(String(to).trim()) || /@latest/.test(name) });
  }
  return out;
}

export function parseManifest(file, text) {
  if (!text) return {};
  if (file.endsWith('package.json')) {
    try {
      const j = JSON.parse(text);
      return { ...j.dependencies, ...j.devDependencies, ...j.optionalDependencies };
    } catch { return {}; }
  }
  const deps = {};
  if (file.endsWith('.csproj')) {
    for (const m of text.matchAll(/<PackageReference\s+Include="([^"]+)"(?:\s+Version="([^"]*)")?/g)) deps[m[1]] = m[2] ?? '(central)';
  } else if (/requirements.*\.txt$/.test(file)) {
    for (const l of text.split('\n')) {
      const m = l.trim().match(/^([A-Za-z0-9_.-]+)\s*(==|>=|~=|<=|>|<)?\s*([^\s#;]*)/);
      if (m && !l.trim().startsWith('#') && !l.trim().startsWith('-')) deps[m[1]] = m[2] === '==' ? m[3] : `${m[2] ?? '*'}${m[3]}`;
    }
  } else if (file.endsWith('pubspec.yaml')) {
    let inDeps = false;
    for (const l of text.split('\n')) {
      if (/^(dependencies|dev_dependencies):/.test(l)) { inDeps = true; continue; }
      if (/^\S/.test(l)) inDeps = false;
      const m = inDeps && l.match(/^\s{2}([a-z0-9_]+):\s*(\S.*)?$/);
      if (m) deps[m[1]] = (m[2] ?? '').trim() || '(complex)';
    }
  } else if (file.endsWith('pom.xml')) {
    for (const m of text.matchAll(/<artifactId>([^<]+)<\/artifactId>\s*(?:<version>([^<]+)<\/version>)?/g)) deps[m[1]] = m[2] ?? '(managed)';
  }
  return deps;
}

const MANIFEST = /(^|\/)(package\.json|[^/]+\.csproj|requirements[^/]*\.txt|pubspec\.yaml|pom\.xml)$/;

function git(args, cwd) {
  try { return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 * 1024 * 1024 }); } catch { return ''; }
}

// `git diff --no-index` exits 1 when the files differ, so keep stdout from the error.
function gitNoIndex(args, cwd) {
  try { return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 * 1024 * 1024 }); } catch (e) { return e.stdout ? String(e.stdout) : ''; }
}

export function run({ cwd = process.cwd(), strict = false, audit = false } = {}) {
  if (!git(['rev-parse', '--git-dir'], cwd)) return { error: 'not a git repository', exit: 2 };
  const root = git(['rev-parse', '--show-toplevel'], cwd).trim();
  const untracked = git(['ls-files', '--others', '--exclude-standard'], root).split('\n').filter(Boolean);
  let diff = git(['diff', 'HEAD', '-U0'], root) || git(['diff', '-U0'], root);
  for (const f of untracked) {
    if (!existsSync(join(root, f))) continue;
    diff += gitNoIndex(['diff', '--no-index', '-U0', '--', '/dev/null', f], root).replace(/^\+\+\+ b\/.*/m, `+++ b/${f}`);
  }
  const secrets = scanSecrets(diff);

  const changed = new Set([...git(['diff', 'HEAD', '--name-only'], root).split('\n'), ...untracked].filter((f) => f && MANIFEST.test(f)));
  const deps = [];
  for (const f of changed) {
    const before = parseManifest(f, git(['show', `HEAD:${f}`], root));
    const after = parseManifest(f, existsSync(join(root, f)) ? readFileSync(join(root, f), 'utf8') : '');
    for (const d of diffDeps(before, after)) deps.push({ file: f, ...d });
  }

  const audits = [];
  if (audit) {
    const tryRun = (label, cmd, args, ok) => {
      if (!ok) return;
      try { execFileSync(cmd, args, { cwd: root, stdio: 'pipe', timeout: 240000 }); audits.push({ label, ok: true }); }
      catch (e) { audits.push({ label, ok: false, detail: String(e.stdout || e.message).split('\n').slice(0, 8).join('\n') }); }
    };
    tryRun('npm audit', 'npm', ['audit', '--omit=dev', '--audit-level=high'], existsSync(join(root, 'package-lock.json')));
    const sln = git(['ls-files', '*.sln', '*.slnx', '*.csproj'], root).split('\n').filter(Boolean)[0];
    tryRun('dotnet vulnerable packages', 'dotnet', ['list', sln ?? '', 'package', '--vulnerable', '--include-transitive'], Boolean(sln));
  }

  const unpinned = deps.filter((d) => d.unpinned);
  let exit = 0;
  if (secrets.length) exit = 1;
  if (strict && (unpinned.length || audits.some((a) => !a.ok))) exit = 1;
  return { secrets, deps, unpinned, audits, exit };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = new Set(process.argv.slice(2));
  const r = run({ strict: args.has('--strict'), audit: args.has('--audit') });
  if (r.error) { console.error(r.error); process.exit(r.exit); }
  if (args.has('--json')) console.log(JSON.stringify(r, null, 2));
  else {
    console.log(r.secrets.length ? `Secrets: ${r.secrets.length} possible (values not shown)` : 'Secrets: none');
    for (const s of r.secrets) console.log(`  ${s.file}:${s.line}  ${s.kind}`);
    console.log(r.deps.length ? `New or changed dependencies: ${r.deps.length}` : 'New or changed dependencies: none');
    for (const d of r.deps) console.log(`  ${d.file}: ${d.name} ${d.from ?? '(new)'} -> ${d.to}${d.unpinned ? '   WARNING: unpinned' : ''}`);
    for (const a of r.audits) console.log(`Audit ${a.label}: ${a.ok ? 'clean' : 'FAILED\n' + (a.detail ?? '')}`);
  }
  process.exit(r.exit);
}
