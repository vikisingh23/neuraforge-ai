#!/usr/bin/env node

/**
 * NeuraForge AI — Cross-platform installer
 * Works on Windows, Mac, Linux
 *
 * Usage: npx neuraforge-ai [platform] [--dry-run] [--latest]
 *    or: node install.mjs [platform] [--dry-run]
 *        npx neuraforge-ai verify     scan changed files for secrets and list new dependencies
 *        npx neuraforge-ai feedback   review and submit agent feedback
 *
 * Installs the version bundled in the package (reproducible, no network). --latest fetches the newest from GitHub instead.
 *
 * Platforms: claude | cursor | gemini | codex | kiro | copilot | opencode | antigravity | hermes
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';
import { homedir, platform as osPlatform } from 'os';
import { MAIN_THREAD_ONLY, toClaudeAgent, toGeminiAgent, toCodexAgentToml, mcpToCodexToml } from './tools/install/adapters.mjs';

const REPO = 'https://github.com/vikisingh23/neuraforge-ai';
// NEURAFORGE_SRC=/path/to/checkout installs from a local copy instead of cloning (used for testing and offline installs).
const LOCAL_SRC = process.env.NEURAFORGE_SRC ? resolve(process.env.NEURAFORGE_SRC) : null;
// The files next to this installer: the npm package (or a checkout). Used by default so an install is reproducible
// for the version you ran, needs no network and no git. `--latest` fetches the newest main from GitHub instead.
const PKG_ROOT = dirname(fileURLToPath(import.meta.url));
const FROM_LATEST = process.argv.includes('--latest');
const BUNDLED = !FROM_LATEST && existsSync(join(PKG_ROOT, 'agents')) ? PKG_ROOT : null;
const CLONE_DIR = LOCAL_SRC ?? BUNDLED ?? join(homedir(), '.neuraforge-ai');
const PKG_VERSION = (() => { try { return JSON.parse(readFileSync(join(PKG_ROOT, 'package.json'), 'utf8')).version; } catch { return 'unknown'; } })();

const KNOWN_PLATFORMS = ['claude', 'cursor', 'gemini', 'codex', 'kiro', 'copilot', 'opencode', 'antigravity', 'hermes'];

const log = (msg) => console.log(`\x1b[34m⚒️  ${msg}\x1b[0m`);
const ok = (msg) => console.log(`\x1b[32m✅ ${msg}\x1b[0m`);
const warn = (msg) => console.log(`\x1b[33m⚠️  ${msg}\x1b[0m`);
const err = (msg) => console.error(`\x1b[31m❌ ${msg}\x1b[0m`);

// Parse CLI flags
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isDoctor = args.includes('--doctor');
const platformArg = args.find((a) => !a.startsWith('-'));

// Subcommands that run bundled tools in the current project.
const SUBCOMMANDS = { verify: 'tools/verify/post-gen-check.mjs', feedback: 'tools/feedback/index.mjs' };
if (args.includes('--version') || args.includes('-v')) {
  console.log(PKG_VERSION);
  process.exit(0);
}
if (args.includes('--help') || args.includes('-h')) {
  console.log(`NeuraForge AI ${PKG_VERSION}\n\nUsage:\n  npx neuraforge-ai [platform] [--dry-run] [--latest]\n  npx neuraforge-ai verify [--strict] [--audit] [--json]\n  npx neuraforge-ai feedback <list|submit|clean|lessons|init>\n  npx neuraforge-ai --doctor | --version\n\nPlatforms: claude | cursor | gemini | codex | kiro | copilot | opencode | antigravity | hermes\nWithout a platform, every tool found on this machine is configured.\n--latest installs the newest version from GitHub instead of the bundled one.`);
  process.exit(0);
}
if (platformArg && SUBCOMMANDS[platformArg]) {
  const rest = args.slice(args.indexOf(platformArg) + 1);
  const r = spawnSync(process.execPath, [join(PKG_ROOT, SUBCOMMANDS[platformArg]), ...rest], { stdio: 'inherit' });
  process.exit(r.status ?? 1);
}

// Validate platform argument if provided
if (platformArg && !KNOWN_PLATFORMS.includes(platformArg)) {
  err(`Unknown platform: "${platformArg}"`);
  console.error(`Valid platforms: ${KNOWN_PLATFORMS.join(' | ')}`);
  process.exit(1);
}

// Detect every platform present on this machine, not just the first match —
// someone with both Claude Code and Cursor installed should get both wired
// up in one run rather than having to re-run the installer per tool.
function detectAll() {
  const found = new Set();

  // Directory-based detection is more reliable than CLI --version probing
  if (existsSync(join(homedir(), '.cursor'))) found.add('cursor');
  if (existsSync(join(homedir(), '.gemini'))) found.add('gemini');
  if (existsSync(join(homedir(), '.kiro'))) found.add('kiro');

  // CLI presence checks — covers tools with no telltale home directory
  const checks = [
    ['claude', 'claude'],
    ['cursor', 'cursor'],
    ['gemini', 'gemini'],
    ['codex', 'codex'],
    ['kiro', 'kiro-cli'],
    ['opencode', 'opencode'],
  ];
  for (const [name, cmd] of checks) {
    try {
      execSync(`${cmd} --version`, { stdio: 'ignore' });
      found.add(name);
    } catch {
      // not installed or not in PATH — continue
    }
  }

  return [...found];
}

function cloneRepo() {
  if (LOCAL_SRC) {
    if (!existsSync(join(LOCAL_SRC, 'agents'))) {
      err(`NEURAFORGE_SRC does not look like a NeuraForge checkout: ${LOCAL_SRC}`);
      process.exit(1);
    }
    log(`Using local source: ${LOCAL_SRC}`);
    return;
  }
  if (BUNDLED) {
    log(`Installing bundled version ${PKG_VERSION} (use --latest for the newest from GitHub)`);
    return;
  }
  if (existsSync(CLONE_DIR)) {
    log('Updating NeuraForge AI...');
    try {
      execSync(`git -C "${CLONE_DIR}" pull --progress`, { stdio: 'inherit' });
    } catch (e) {
      err(`Failed to update repo at ${CLONE_DIR}: ${e.message}`);
      err('Try deleting ~/.neuraforge-ai and re-running the installer.');
      process.exit(1);
    }
  } else {
    log('Downloading NeuraForge AI...');
    try {
      execSync(`git clone --depth 1 --progress "${REPO}" "${CLONE_DIR}"`, { stdio: 'inherit' });
    } catch (e) {
      err(`Failed to clone repo: ${e.message}`);
      err('Check your internet connection and that git is installed.');
      process.exit(1);
    }
  }
}

function copyFiles(files) {
  const isWindows = osPlatform() === 'win32';
  let allOk = true;

  for (const f of files) {
    const src = join(CLONE_DIR, f);
    const dst = join(process.cwd(), f);

    if (!existsSync(src)) {
      warn(`Source not found, skipping: ${f}`);
      continue;
    }

    if (isDryRun) {
      log(`[dry-run] Would copy: ${f}`);
      continue;
    }

    const parentDir = join(dst, '..');
    if (!existsSync(parentDir)) {
      mkdirSync(parentDir, { recursive: true });
    }

    if (isWindows) {
      try {
        execSync(`xcopy "${src}" "${dst}" /E /I /Y /Q`, { stdio: 'pipe' });
        ok(f);
      } catch (e) {
        err(`Failed to copy ${f}: ${e.stderr?.toString().trim() || e.message}`);
        allOk = false;
      }
    } else {
      try {
        execSync(`cp -r "${src}" "${dst}"`, { stdio: 'pipe' });
        ok(f);
      } catch (e) {
        err(`Failed to copy ${f}: ${e.stderr?.toString().trim() || e.message}`);
        allOk = false;
      }
    }
  }

  return allOk;
}

// Copy a whole directory's contents into a differently-named destination
// directory — for platforms whose native discovery path doesn't match this
// repo's own top-level folder names (e.g. Claude Code only auto-discovers
// project subagents/skills under .claude/agents/ and .claude/skills/, not a
// bare top-level agents/ or skills/ folder; Kiro uses .kiro/agents/ and
// .kiro/steering/).
function copyDirTo(srcRelDir, destRelDir) {
  return copyDirToPath(srcRelDir, join(process.cwd(), destRelDir), destRelDir);
}

// Same as copyDirTo, but to an absolute destination rather than one relative
// to the current project — for platforms like Hermes whose skill directory
// is a single global location (~/.hermes/skills/), not per-project.
function copyDirToAbsolute(srcRelDir, destAbsDir, label) {
  return copyDirToPath(srcRelDir, destAbsDir, label ?? destAbsDir);
}

function copyDirToPath(srcRelDir, dst, label) {
  const src = join(CLONE_DIR, srcRelDir);
  const isWindows = osPlatform() === 'win32';

  if (!existsSync(src)) {
    warn(`Source not found, skipping: ${srcRelDir}`);
    return false;
  }

  if (isDryRun) {
    log(`[dry-run] Would copy: ${srcRelDir}/* -> ${label}/`);
    return true;
  }

  try {
    if (!existsSync(dst)) mkdirSync(dst, { recursive: true });
    if (isWindows) {
      execSync(`xcopy "${src}" "${dst}" /E /I /Y /Q`, { stdio: 'pipe' });
    } else {
      execSync(`cp -r "${src}/." "${dst}/"`, { stdio: 'pipe' });
    }
    ok(`${label}/`);
    return true;
  } catch (e) {
    err(`Failed to copy ${srcRelDir} -> ${label}: ${e.stderr?.toString().trim() || e.message}`);
    return false;
  }
}

// Copy .mcp.json to a different destination path/name — for platforms that
// use the same mcpServers schema but look for it somewhere other than
// ".mcp.json" in the project root (e.g. Antigravity expects
// .agents/mcp_config.json).
function copyMcpConfigTo(destRelPath) {
  const src = join(CLONE_DIR, '.mcp.json');
  const dst = join(process.cwd(), destRelPath);

  if (!existsSync(src)) {
    warn('Source not found, skipping: .mcp.json');
    return false;
  }

  if (isDryRun) {
    log(`[dry-run] Would copy: .mcp.json -> ${destRelPath}`);
    return true;
  }

  try {
    const parentDir = dirname(dst);
    if (!existsSync(parentDir)) mkdirSync(parentDir, { recursive: true });
    writeFileSync(dst, readFileSync(src));
    ok(destRelPath);
    return true;
  } catch (e) {
    err(`Failed to copy .mcp.json -> ${destRelPath}: ${e.message}`);
    return false;
  }
}

// ── Generated, tool-native files ──────────────────────────────────────────────
// agents/<name>.md + .json stay the single source of truth. Each tool gets the
// format it actually discovers (see tools/install/adapters.mjs).

function readAgents() {
  const dir = join(CLONE_DIR, 'agents');
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json') && existsSync(join(dir, f.replace(/\.json$/, '.md'))))
    .map((f) => {
      const name = f.slice(0, -5);
      return { name, cfg: JSON.parse(readFileSync(join(dir, f), 'utf8')), md: readFileSync(join(dir, `${name}.md`), 'utf8') };
    });
}

// Write a generated file relative to the project. ifAbsent keeps user-owned files (config.toml, CLAUDE.md) untouched.
function writeGenerated(relPath, content, { ifAbsent = false } = {}) {
  const dst = join(process.cwd(), relPath);
  if (ifAbsent && existsSync(dst)) {
    warn(`${relPath} already exists, left unchanged`);
    return true;
  }
  if (isDryRun) {
    log(`[dry-run] Would write: ${relPath}`);
    return true;
  }
  try {
    mkdirSync(dirname(dst), { recursive: true });
    writeFileSync(dst, content);
    return true;
  } catch (e) {
    err(`Failed to write ${relPath}: ${e.message}`);
    return false;
  }
}

// kind: 'claude' | 'gemini' | 'codex'. Orchestrators are skipped: they spawn other agents, so they run in the main
// thread through their skill (subagents cannot spawn subagents).
function generateAgentFiles(kind) {
  const agents = readAgents().filter((a) => !MAIN_THREAD_ONLY.has(a.name));
  let allOk = true;
  for (const { name, cfg, md } of agents) {
    if (kind === 'claude') allOk = writeGenerated(`.claude/agents/${name}.md`, toClaudeAgent(name, cfg, md)) && allOk;
    if (kind === 'gemini') allOk = writeGenerated(`.gemini/agents/${name}.md`, toGeminiAgent(name, cfg, md)) && allOk;
    if (kind === 'codex') allOk = writeGenerated(`.codex/agents/${name.replace(/-/g, '_')}.toml`, toCodexAgentToml(name, cfg, md)) && allOk;
  }
  if (!isDryRun && allOk) ok(`${agents.length} ${kind} agents generated`);
  return allOk;
}

function generateCodexMcp() {
  const src = join(CLONE_DIR, '.mcp.json');
  if (!existsSync(src)) return true;
  return writeGenerated('.codex/config.toml', mcpToCodexToml(JSON.parse(readFileSync(src, 'utf8'))), { ifAbsent: true });
}

// Claude Code reads CLAUDE.md, not AGENTS.md. Import it so one file serves every tool.
function ensureClaudeMd() {
  return writeGenerated('CLAUDE.md', '@AGENTS.md\n', { ifAbsent: true });
}

// .agents/skills is read by Gemini CLI, Antigravity and Codex (Agent Skills open standard).
function installSharedSkills() {
  return copyDirTo('skills', '.agents/skills');
}

// The post-generation check is installed into the project so agents can run it without npm or network.
function installProjectTools() {
  const src = join(CLONE_DIR, 'tools', 'verify', 'post-gen-check.mjs');
  if (!existsSync(src)) return true;
  return writeGenerated('.neuraforge/tools/post-gen-check.mjs', readFileSync(src, 'utf8'));
}

// ── Doctor mode ───────────────────────────────────────────────────────────────

function runDoctor() {
  log('NeuraForge AI — Health Check');
  console.log('');
  let passed = 0;
  let failed = 0;

  function check(label, fn) {
    try {
      fn();
      ok(label);
      passed++;
    } catch {
      err(label);
      failed++;
    }
  }

  check('agents/ directory exists', () => {
    if (!existsSync('agents')) throw new Error();
  });
  check('rules/ directory exists', () => {
    if (!existsSync('rules')) throw new Error();
  });
  check('skills/ directory exists', () => {
    if (!existsSync('skills')) throw new Error();
  });
  check('AGENTS.md exists', () => {
    if (!existsSync('AGENTS.md')) throw new Error();
  });
  check('.mcp.json exists and is valid JSON', () => {
    if (!existsSync('.mcp.json')) throw new Error();
    JSON.parse(readFileSync('.mcp.json', 'utf8'));
  });
  check('No @latest in .mcp.json', () => {
    if (!existsSync('.mcp.json')) throw new Error();
    const content = readFileSync('.mcp.json', 'utf8');
    if (content.includes('@latest')) throw new Error();
  });
  check('Node.js 18+ available', () => {
    const [major] = process.versions.node.split('.').map(Number);
    if (major < 18) throw new Error();
  });

  console.log('');
  console.log(`Passed: ${passed}  Failed: ${failed}`);
  if (failed === 0) {
    ok('All checks passed');
  } else {
    err(`${failed} check(s) failed`);
    process.exit(1);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

if (isDoctor) {
  runDoctor();
  process.exit(0);
}

// 'skills' is always copied so paths such as skills/dotnet-forge/references/ resolve for every tool.
const common = ['AGENTS.md', 'agents', 'rules', 'skills'];

function installForPlatform(detectedPlatform) {
  let success = installProjectTools();

  switch (detectedPlatform) {
    case 'claude':
      log('Configuring for Claude Code...');
      success = copyFiles([...common, '.mcp.json']);
      // Native discovery: subagents are .claude/agents/<name>.md WITH YAML frontmatter (files without it are
      // skipped), and Skills are .claude/skills/<name>/SKILL.md. Generate the former, copy the latter.
      success = generateAgentFiles('claude') && success;
      success = copyDirTo('skills', '.claude/skills') && success;
      success = ensureClaudeMd() && success;
      if (!isDryRun && success) ok('Claude Code configured — .claude/agents (subagents) + .claude/skills + CLAUDE.md importing AGENTS.md + .mcp.json. Orchestrators run in the main thread via their skills.');
      break;

    case 'cursor':
      log('Configuring for Cursor...');
      success = copyFiles([...common, '.cursor', '.mcp.json']);
      if (!isDryRun && success) ok('Cursor rules + MCP servers configured. Restart Cursor.');
      break;

    case 'gemini':
      log('Configuring for Gemini CLI...');
      success = copyFiles([...common, '.gemini', 'GEMINI.md', '.mcp.json']);
      success = generateAgentFiles('gemini') && success;
      success = installSharedSkills() && success;
      if (!isDryRun && success) ok('Gemini CLI configured — .gemini/agents (subagents) + .agents/skills + GEMINI.md/AGENTS.md.');
      break;

    case 'codex':
      log('Configuring for Codex...');
      success = copyFiles([...common, '.mcp.json']);
      success = generateAgentFiles('codex') && success;
      success = installSharedSkills() && success;
      success = generateCodexMcp() && success;
      if (!isDryRun && success) ok('Codex configured — AGENTS.md + .codex/agents (custom agents) + .agents/skills + .codex/config.toml (MCP, if it did not already exist).');
      break;

    case 'opencode':
    case 'copilot':
      log(`Configuring for ${detectedPlatform}...`);
      success = copyFiles([...common, '.mcp.json']);
      if (!isDryRun && success) ok(`${detectedPlatform} configured. AGENTS.md will be auto-discovered.`);
      break;

    case 'kiro':
      log('Configuring for Kiro...');
      success = copyFiles([...common, '.mcp.json']);
      // kiro-cli chat --agent <name> resolves against .kiro/agents/<name>.md,
      // and steering context is pulled from .kiro/steering/ — not the bare
      // top-level agents/ or rules/ folders this repo ships at its own root.
      success = copyDirTo('agents', '.kiro/agents') && success;
      success = copyDirTo('rules', '.kiro/steering') && success;
      success = copyDirTo('skills', '.kiro/skills') && success;
      if (!isDryRun && success) ok('Kiro configured — .kiro/agents + .kiro/steering + .kiro/skills wired for `kiro-cli chat --agent <name>`.');
      break;

    case 'hermes':
      log('Configuring for Hermes...');
      // Hermes' skill directory is a single global location, not per-project —
      // skills installed anywhere else simply aren't discovered. AGENTS.md +
      // agents/ + rules/ still go to the project root like every other
      // platform, because each skill's own text says "for full instructions,
      // read agents/{name}.md" — a path that only resolves when Hermes is
      // run from inside a project that actually has that folder.
      success = copyFiles([...common, '.mcp.json']);
      success = copyDirToAbsolute('skills', join(homedir(), '.hermes', 'skills', 'neuraforge'), '~/.hermes/skills/neuraforge') && success;
      if (!isDryRun && success) {
        ok('Hermes configured — skills installed to ~/.hermes/skills/neuraforge (global), AGENTS.md + agents/ + rules/ in this project.');
        warn('Run Hermes from this project directory — skills reference agents/*.md by a path relative to the project, not to the global skills folder.');
      }
      break;

    case 'antigravity':
      log('Configuring for Antigravity...');
      success = copyFiles([...common, '.mcp.json']);
      // Antigravity doesn't read .mcp.json from the project root — it looks for
      // .agents/mcp_config.json (same mcpServers schema, different path).
      success = copyMcpConfigTo('.agents/mcp_config.json') && success;
      success = installSharedSkills() && success;
      if (!isDryRun && success) ok('Antigravity configured. AGENTS.md auto-discovered; skills at .agents/skills; MCP servers at .agents/mcp_config.json.');
      break;

    default:
      warn('Platform not detected. Installing universal config...');
      success = copyFiles([...common, '.mcp.json']);
      if (!isDryRun && success) ok('AGENTS.md + agents + rules + MCP config installed.');
      console.log('');
      console.log(`Specify platform: node install.mjs [${KNOWN_PLATFORMS.join('|')}]`);
  }

  console.log('');
  return success;
}

log(`NeuraForge AI ${PKG_VERSION}`);
if (isDryRun) warn('Dry-run mode — no files will be written');
console.log('');

const platformsToInstall = platformArg ? [platformArg] : detectAll();
if (platformsToInstall.length === 0) platformsToInstall.push('unknown');

log(platformsToInstall.length > 1
  ? `Detected platforms: ${platformsToInstall.join(', ')}`
  : `Platform: ${platformsToInstall[0]}`);
console.log('');

cloneRepo();
console.log('');

let success = true;
for (const p of platformsToInstall) {
  success = installForPlatform(p) && success;
}

if (!success) {
  err('Installation completed with errors. Check the messages above.');
  process.exit(1);
}

{
  const count = (dir, test) => { try { return readdirSync(join(CLONE_DIR, dir)).filter(test).length; } catch { return 0; } };
  let servers = 0;
  try { servers = Object.keys(JSON.parse(readFileSync(join(CLONE_DIR, '.mcp.json'), 'utf8')).mcpServers || {}).length; } catch { /* no mcp config */ }
  ok(`${count('agents', (f) => f.endsWith('.json'))} agents · ${servers} MCP servers · ${count('skills', (f) => existsSync(join(CLONE_DIR, 'skills', f, 'SKILL.md')))} skills · 7 stacks`);
}
console.log(`Docs: ${REPO}`);

if (!isDryRun && success) {
  console.log('');
  log('If this saves you time, a star helps other devs find it:');
  console.log(`   ${REPO}`);
  log('Something generated wrong? Run `npx neuraforge-ai feedback submit` —');
  log('that\'s how the anti-pattern rules get sharper for everyone.');
}
