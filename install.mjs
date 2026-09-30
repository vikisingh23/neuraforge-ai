#!/usr/bin/env node

/**
 * NeuraForge AI — Cross-platform installer
 * Works on Windows, Mac, Linux
 *
 * Usage: npx neuraforge-ai-setup
 *    or: node install.mjs [platform] [--dry-run]
 *
 * Platforms: claude | cursor | gemini | codex | kiro | copilot | opencode
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { homedir, platform as osPlatform } from 'os';

const REPO = 'https://github.com/vikisingh23/neuraforge-ai';
const CLONE_DIR = join(homedir(), '.neuraforge-ai');

const KNOWN_PLATFORMS = ['claude', 'cursor', 'gemini', 'codex', 'kiro', 'copilot', 'opencode'];

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

function detect() {
  // Directory-based detection is more reliable than CLI --version probing
  if (existsSync(join(homedir(), '.cursor'))) return 'cursor';
  if (existsSync(join(homedir(), '.gemini'))) return 'gemini';
  if (existsSync(join(homedir(), '.kiro'))) return 'kiro';

  // Fall back to CLI presence checks
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
      return name;
    } catch {
      // not installed or not in PATH — continue
    }
  }
  return 'unknown';
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
    JSON.parse(require('fs').readFileSync('.mcp.json', 'utf8'));
  });
  check('No @latest in .mcp.json', () => {
    if (!existsSync('.mcp.json')) throw new Error();
    const content = require('fs').readFileSync('.mcp.json', 'utf8');
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

log('NeuraForge AI Installer');
if (isDryRun) warn('Dry-run mode — no files will be written');
console.log('');

const detectedPlatform = platformArg || detect();
log(`Platform: ${detectedPlatform}`);
console.log('');

cloneRepo();
console.log('');

const common = ['AGENTS.md', 'agents', 'rules'];
let success = true;

switch (detectedPlatform) {
  case 'claude':
    log('Configuring for Claude Code...');
    success = copyFiles([...common, 'skills', '.mcp.json']);
    if (!isDryRun && success) ok('Files installed. Add agents/ and rules/ to your project root.');
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
  case 'kiro':
  case 'copilot':
    log(`Configuring for ${detectedPlatform}...`);
    success = copyFiles([...common, '.mcp.json']);
    if (!isDryRun && success) ok(`${detectedPlatform} configured. AGENTS.md will be auto-discovered.`);
    break;

  default:
    warn('Platform not detected. Installing universal config...');
    success = copyFiles([...common, '.mcp.json']);
    if (!isDryRun && success) ok('AGENTS.md + agents + rules + MCP config installed.');
    console.log('');
    console.log(`Specify platform: node install.mjs [${KNOWN_PLATFORMS.join('|')}]`);
}

console.log('');

if (!success) {
  err('Installation completed with errors. Check the messages above.');
  process.exit(1);
}

ok('40 agents · 22 MCP servers · 35 skills · 7 stacks');
console.log(`Docs: ${REPO}`);
