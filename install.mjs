#!/usr/bin/env node

/**
 * NeuraForge AI — Cross-platform installer
 * Works on Windows, Mac, Linux
 *
 * Usage: npx neuraforge-ai-setup
 *    or: node install.mjs [platform] [--dry-run]
 *
 * Platforms: claude | cursor | gemini | codex | kiro | copilot | opencode | antigravity
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { homedir, platform as osPlatform } from 'os';

const REPO = 'https://github.com/vikisingh23/neuraforge-ai';
const CLONE_DIR = join(homedir(), '.neuraforge-ai');

const KNOWN_PLATFORMS = ['claude', 'cursor', 'gemini', 'codex', 'kiro', 'copilot', 'opencode', 'antigravity'];

const log = (msg) => console.log(`\x1b[34m⚒️  ${msg}\x1b[0m`);
const ok = (msg) => console.log(`\x1b[32m✅ ${msg}\x1b[0m`);
const warn = (msg) => console.log(`\x1b[33m⚠️  ${msg}\x1b[0m`);
const err = (msg) => console.error(`\x1b[31m❌ ${msg}\x1b[0m`);

// Parse CLI flags
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isDoctor = args.includes('--doctor');
const platformArg = args.find((a) => !a.startsWith('--'));

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
  const src = join(CLONE_DIR, srcRelDir);
  const dst = join(process.cwd(), destRelDir);
  const isWindows = osPlatform() === 'win32';

  if (!existsSync(src)) {
    warn(`Source not found, skipping: ${srcRelDir}`);
    return false;
  }

  if (isDryRun) {
    log(`[dry-run] Would copy: ${srcRelDir}/* -> ${destRelDir}/`);
    return true;
  }

  try {
    if (!existsSync(dst)) mkdirSync(dst, { recursive: true });
    if (isWindows) {
      execSync(`xcopy "${src}" "${dst}" /E /I /Y /Q`, { stdio: 'pipe' });
    } else {
      execSync(`cp -r "${src}/." "${dst}/"`, { stdio: 'pipe' });
    }
    ok(`${destRelDir}/`);
    return true;
  } catch (e) {
    err(`Failed to copy ${srcRelDir} -> ${destRelDir}: ${e.stderr?.toString().trim() || e.message}`);
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

const common = ['AGENTS.md', 'agents', 'rules'];

function installForPlatform(detectedPlatform) {
  let success = true;

  switch (detectedPlatform) {
    case 'claude':
      log('Configuring for Claude Code...');
      success = copyFiles([...common, 'skills', '.mcp.json']);
      // Native discovery: project subagents live at .claude/agents/*.md and
      // project Skills at .claude/skills/<name>/SKILL.md — a bare top-level
      // agents/ or skills/ folder is NOT picked up as subagents/slash-command
      // Skills on its own. Mirror both into .claude/ so they actually register.
      success = copyDirTo('agents', '.claude/agents') && success;
      success = copyDirTo('skills', '.claude/skills') && success;
      if (!isDryRun && success) ok('Files installed — AGENTS.md + .claude/agents (subagents) + .claude/skills (slash commands) + project .mcp.json.');
      break;

    case 'cursor':
      log('Configuring for Cursor...');
      success = copyFiles([...common, '.cursor', '.mcp.json']);
      if (!isDryRun && success) ok('Cursor rules + MCP servers configured. Restart Cursor.');
      break;

    case 'gemini':
      log('Configuring for Gemini CLI...');
      success = copyFiles([...common, '.gemini', 'GEMINI.md', '.mcp.json']);
      if (!isDryRun && success) ok('Gemini CLI configured.');
      break;

    case 'codex':
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
      if (!isDryRun && success) ok('Kiro configured — .kiro/agents + .kiro/steering wired for `kiro-cli chat --agent <name>`.');
      break;

    case 'antigravity':
      log('Configuring for Antigravity...');
      success = copyFiles([...common, '.mcp.json']);
      // Antigravity doesn't read .mcp.json from the project root — it looks for
      // .agents/mcp_config.json (same mcpServers schema, different path).
      success = copyMcpConfigTo('.agents/mcp_config.json') && success;
      if (!isDryRun && success) ok('Antigravity configured. AGENTS.md auto-discovered; MCP servers at .agents/mcp_config.json.');
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

log('NeuraForge AI Installer');
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

ok('45 agents · 22 MCP servers · 39 skills · 7 stacks');
console.log(`Docs: ${REPO}`);

if (!isDryRun && success) {
  console.log('');
  log('If this saves you time, a star helps other devs find it:');
  console.log(`   ${REPO}`);
  log('Something generated wrong? Tell the agent to run `npm run feedback:submit` —');
  log('that\'s how the anti-pattern rules get sharper for everyone.');
}
