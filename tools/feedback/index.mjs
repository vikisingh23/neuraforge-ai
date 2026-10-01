#!/usr/bin/env node
/**
 * NeuraForge AI — Feedback CLI
 *
 * Collects agent feedback logs, lets you review corrections,
 * and submits confirmed bugs as GitHub issues to improve agent prompts.
 *
 * Usage (from your project root where neuraforge is installed):
 *   node path/to/neuraforge-ai/tools/feedback/index.mjs <command>
 *
 * Or via npm scripts (if package.json is configured):
 *   npm run feedback:list
 *   npm run feedback:submit
 *   npm run feedback:clean
 *   npm run feedback:lessons
 *   npm run feedback:init
 */

import { readFileSync, writeFileSync, readdirSync, unlinkSync, mkdirSync, existsSync, copyFileSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CWD = process.cwd();
const FEEDBACK_DIR = join(CWD, '.neuraforge', 'feedback');
const LESSONS_FILE = join(CWD, '.neuraforge', 'lessons.md');
const ANTI_PATTERNS_DIR = join(__dirname, '../../rules/anti-patterns');
const TEMPLATE_SRC = join(__dirname, '../../.neuraforge/feedback/TEMPLATE.md');

const GREEN  = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE   = '\x1b[34m';
const RED    = '\x1b[31m';
const GREY   = '\x1b[90m';
const BOLD   = '\x1b[1m';
const NC     = '\x1b[0m';

const ok   = (m) => console.log(`${GREEN}✅ ${m}${NC}`);
const warn = (m) => console.log(`${YELLOW}⚠️  ${m}${NC}`);
const info = (m) => console.log(`${BLUE}ℹ  ${m}${NC}`);
const err  = (m) => console.error(`${RED}❌ ${m}${NC}`);
const dim  = (m) => console.log(`${GREY}${m}${NC}`);

// ── Frontmatter parser (no dependencies) ────────────────────────────────────

function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { meta: {}, body: content };

  const meta = {};
  for (const line of match[1].split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    const val = line.slice(colonIdx + 1).trim();
    meta[key] = val;
  }
  return { meta, body: match[2] };
}

// ── Read all feedback files ──────────────────────────────────────────────────

function readFeedbackFiles() {
  if (!existsSync(FEEDBACK_DIR)) return [];

  return readdirSync(FEEDBACK_DIR)
    .filter((f) => f.endsWith('.md') && f !== 'TEMPLATE.md')
    .map((file) => {
      const fullPath = join(FEEDBACK_DIR, file);
      const content = readFileSync(fullPath, 'utf8');
      const { meta, body } = parseFrontmatter(content);
      return { file, fullPath, meta, body, content };
    })
    .sort((a, b) => (a.meta.date || '').localeCompare(b.meta.date || ''));
}

// ── Extract a section from markdown body ─────────────────────────────────────

function extractSection(body, heading) {
  const pattern = new RegExp(`## ${heading}\\s*\\n([\\s\\S]*?)(?=\\n## |$)`);
  const match = body.match(pattern);
  return match ? match[1].trim() : '';
}

// ── Commands ─────────────────────────────────────────────────────────────────

function cmdInit() {
  mkdirSync(FEEDBACK_DIR, { recursive: true });

  const templateDst = join(FEEDBACK_DIR, 'TEMPLATE.md');
  if (!existsSync(templateDst) && existsSync(TEMPLATE_SRC)) {
    copyFileSync(TEMPLATE_SRC, templateDst);
    ok(`Template copied to .neuraforge/feedback/TEMPLATE.md`);
  } else if (!existsSync(templateDst)) {
    warn('Template source not found — feedback dir created but no template copied.');
  }

  // Suggest .gitignore entry
  const gitignorePath = join(CWD, '.gitignore');
  const gitignoreEntry = '\n# NeuraForge feedback logs (project-local, do not commit)\n.neuraforge/feedback/*.md\n!.neuraforge/feedback/TEMPLATE.md\n.neuraforge/lessons.md\n';
  if (existsSync(gitignorePath)) {
    const current = readFileSync(gitignorePath, 'utf8');
    if (!current.includes('.neuraforge/feedback')) {
      writeFileSync(gitignorePath, current + gitignoreEntry);
      ok('.gitignore updated — feedback logs excluded');
    } else {
      dim('.gitignore already excludes feedback logs');
    }
  } else {
    warn('No .gitignore found — add this to avoid committing feedback logs:');
    console.log(gitignoreEntry);
  }

  ok('Feedback system initialized in .neuraforge/feedback/');
  info('Agents will write feedback logs here after generating code.');
  info('Run "feedback:list" to see logs, "feedback:submit" to report bugs to GitHub.');
}

function cmdList() {
  const items = readFeedbackFiles();

  if (items.length === 0) {
    info('No feedback logs found in .neuraforge/feedback/');
    dim('Logs are written automatically by agents after generating code.');
    return;
  }

  const outcomeColor = { pending: YELLOW, accepted: GREEN, corrected: BLUE, rejected: RED };

  console.log('');
  console.log(`${BOLD}Feedback Logs${NC}  (${items.length} total)`);
  console.log('─'.repeat(72));
  console.log(`${'ID'.padEnd(38)} ${'Agent'.padEnd(16)} ${'Outcome'.padEnd(10)} Date`);
  console.log('─'.repeat(72));

  for (const item of items) {
    const { id = item.file, agent = '?', outcome = 'pending', date = '' } = item.meta;
    const color = outcomeColor[outcome] || GREY;
    const shortDate = date.slice(0, 10);
    console.log(`${id.padEnd(38)} ${agent.padEnd(16)} ${color}${outcome.padEnd(10)}${NC} ${shortDate}`);
  }

  console.log('─'.repeat(72));

  const counts = items.reduce((acc, i) => {
    const o = i.meta.outcome || 'pending';
    acc[o] = (acc[o] || 0) + 1;
    return acc;
  }, {});

  const parts = Object.entries(counts).map(([k, v]) => `${k}: ${v}`);
  dim(parts.join('  ·  '));
  console.log('');
}

function cmdSubmit() {
  const items = readFeedbackFiles().filter(
    (i) => i.meta.outcome === 'corrected' || i.meta.outcome === 'rejected',
  );

  if (items.length === 0) {
    info('No corrected or rejected feedback to submit.');
    dim('Edit a feedback file and set outcome: corrected or outcome: rejected to flag a bug.');
    return;
  }

  // Check gh is available
  try {
    execSync('gh --version', { stdio: 'ignore' });
  } catch {
    err('GitHub CLI (gh) not found. Install it from https://cli.github.com');
    err('Or copy the issue body below and open a GitHub issue manually.');
  }

  let submitted = 0;
  let failed = 0;

  for (const item of items) {
    const { id, agent, stack, date, outcome } = item.meta;

    const promptSummary  = extractSection(item.body, 'Prompt Summary');
    const generatedFiles = extractSection(item.body, 'Generated Files');
    const whatWasWrong   = extractSection(item.body, 'What was wrong');
    const correctApproach = extractSection(item.body, 'What the correct approach should be');
    const suggestedRule  = extractSection(item.body, 'Suggested rule to add to the agent');

    const body = `## Agent Bug Report

**Agent:** \`${agent}\`
**Stack:** \`${stack || 'unknown'}\`
**Date:** ${date || 'unknown'}
**Outcome:** ${outcome}
**Feedback ID:** \`${id}\`

## Prompt

${promptSummary || '_Not provided_'}

## Generated Files

${generatedFiles || '_Not provided_'}

## What was wrong

${whatWasWrong || '_Not provided_'}

## Correct approach

${correctApproach || '_Not provided_'}

## Suggested rule to add

${suggestedRule || '_Not provided_'}

---
_Submitted via \`npm run feedback:submit\` · NeuraForge AI feedback system_`;

    const title = `[${agent}] ${promptSummary.slice(0, 60) || 'Bug report'}`;
    const labels = `prompt-fix,agent:${agent}`;

    try {
      const result = execSync(
        `gh issue create --title "${title.replace(/"/g, '\\"')}" --body "${body.replace(/"/g, '\\"').replace(/\n/g, '\\n')}" --label "${labels}" 2>&1`,
        { encoding: 'utf8', cwd: CWD },
      );
      ok(`Submitted: ${result.trim()}`);

      // Mark as submitted
      const updated = item.content.replace('outcome: ' + outcome, 'outcome: submitted');
      writeFileSync(item.fullPath, updated);
      submitted++;
    } catch (e) {
      warn(`Failed to submit ${id}: ${e.message}`);
      console.log('\nIssue body for manual submission:');
      console.log('─'.repeat(60));
      console.log(body);
      console.log('─'.repeat(60));
      failed++;
    }
  }

  console.log('');
  if (submitted > 0) ok(`${submitted} feedback item(s) submitted to GitHub`);
  if (failed > 0) warn(`${failed} item(s) failed — body printed above for manual submission`);
}

function cmdClean() {
  const items = readFeedbackFiles();
  const removable = items.filter((i) => i.meta.outcome === 'accepted' || i.meta.outcome === 'submitted');

  if (removable.length === 0) {
    info('Nothing to clean — no accepted or submitted feedback.');
    return;
  }

  for (const item of removable) {
    unlinkSync(item.fullPath);
    dim(`Removed: ${item.file}`);
  }

  ok(`Cleaned ${removable.length} resolved feedback file(s)`);
}

function cmdLessons() {
  console.log('');
  console.log(`${BOLD}Learned Rules — Anti-Patterns by Stack${NC}`);
  console.log('─'.repeat(60));

  if (existsSync(ANTI_PATTERNS_DIR)) {
    const stacks = readdirSync(ANTI_PATTERNS_DIR).filter((f) => f.endsWith('.md'));
    if (stacks.length > 0) {
      for (const stackFile of stacks) {
        const content = readFileSync(join(ANTI_PATTERNS_DIR, stackFile), 'utf8');
        const patterns = (content.match(/^### \[AP-\d+\]/gm) || []).length;
        console.log(`  ${stackFile.replace('.md', '').padEnd(16)} — ${patterns} anti-pattern(s)`);
      }
    } else {
      dim('  No anti-pattern files yet');
    }
  } else {
    dim('  Anti-patterns directory not found');
  }

  console.log('');

  if (existsSync(LESSONS_FILE)) {
    const content = readFileSync(LESSONS_FILE, 'utf8');
    console.log(`${BOLD}Project-Specific Lessons${NC} (.neuraforge/lessons.md):`);
    console.log(content);
  } else {
    dim('.neuraforge/lessons.md — no project-specific lessons yet');
    dim('Create this file to store lessons that apply to this project only.');
  }
}

function cmdHelp() {
  console.log(`
${BOLD}NeuraForge AI — Feedback CLI${NC}

Commands:
  ${GREEN}init${NC}      Initialize .neuraforge/feedback/ in the current project
  ${GREEN}list${NC}      List all agent feedback logs and their outcomes
  ${GREEN}submit${NC}    Submit corrected/rejected feedback as GitHub issues
  ${GREEN}clean${NC}     Remove accepted and submitted feedback logs
  ${GREEN}lessons${NC}   Show anti-patterns and project-specific learned rules

Workflow:
  1. Use a forge agent — it writes a feedback log to .neuraforge/feedback/
  2. If output was wrong: open the log, set outcome to "corrected", fill in what was wrong
  3. Run "feedback:submit" to report the bug to GitHub
  4. Maintainers review and add a rule to rules/anti-patterns/{stack}.md
  5. On next "git pull", your agent knows the rule and won't make the same mistake
`);
}

// ── Main ─────────────────────────────────────────────────────────────────────

const cmd = process.argv[2];

switch (cmd) {
  case 'init':    cmdInit();    break;
  case 'list':    cmdList();    break;
  case 'submit':  cmdSubmit();  break;
  case 'clean':   cmdClean();   break;
  case 'lessons': cmdLessons(); break;
  default:        cmdHelp();    break;
}
