#!/usr/bin/env node
/**
 * NeuraForge AI — Eval Framework
 *
 * Validates that golden example outputs in examples/ still conform to
 * the rules enforced by each agent. Runs without an LLM — checks the
 * example files directly using must_contain / must_not_contain assertions.
 *
 * Usage:
 *   npm run eval                        # run all agents
 *   npm run eval -- --agent react-forge # run one agent
 *   npm run eval -- --verbose           # show passing cases too
 *   npm run eval -- --json              # machine-readable output
 */

import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const CASES_DIR = join(__dirname, 'cases');

// ─── ANSI colours ────────────────────────────────────────────────────────────
const NO_COLOR = process.env.NO_COLOR || process.env.CI;
const c = {
  reset:  NO_COLOR ? '' : '\x1b[0m',
  bold:   NO_COLOR ? '' : '\x1b[1m',
  red:    NO_COLOR ? '' : '\x1b[31m',
  green:  NO_COLOR ? '' : '\x1b[32m',
  yellow: NO_COLOR ? '' : '\x1b[33m',
  cyan:   NO_COLOR ? '' : '\x1b[36m',
  grey:   NO_COLOR ? '' : '\x1b[90m',
};

// ─── Args ────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const agentFilter = args.includes('--agent') ? args[args.indexOf('--agent') + 1] : null;
const verbose     = args.includes('--verbose') || args.includes('-v');
const jsonOutput  = args.includes('--json');

// ─── Load case files ─────────────────────────────────────────────────────────
function loadCaseFiles() {
  const files = readdirSync(CASES_DIR).filter(f => f.endsWith('.json'));
  return files
    .map(f => {
      try {
        return JSON.parse(readFileSync(join(CASES_DIR, f), 'utf8'));
      } catch (e) {
        console.error(`${c.red}Failed to parse ${f}: ${e.message}${c.reset}`);
        return null;
      }
    })
    .filter(Boolean)
    .filter(suite => !agentFilter || suite.agent === agentFilter);
}

// ─── Run assertions on a single file ─────────────────────────────────────────
function runCase(testCase, suiteAgent) {
  const filePath = join(ROOT, testCase.file);

  if (!existsSync(filePath)) {
    return {
      id:     testCase.id,
      agent:  suiteAgent,
      desc:   testCase.description,
      file:   testCase.file,
      status: 'skip',
      reason: `File not found: ${testCase.file}`,
      failures: [],
    };
  }

  const content = readFileSync(filePath, 'utf8');
  const failures = [];

  for (const pattern of (testCase.must_contain ?? [])) {
    if (!content.includes(pattern)) {
      failures.push({ type: 'must_contain', pattern });
    }
  }

  for (const pattern of (testCase.must_not_contain ?? [])) {
    if (content.includes(pattern)) {
      failures.push({ type: 'must_not_contain', pattern });
    }
  }

  return {
    id:     testCase.id,
    agent:  suiteAgent,
    desc:   testCase.description,
    file:   testCase.file,
    status: failures.length === 0 ? 'pass' : 'fail',
    failures,
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────
function main() {
  const suites = loadCaseFiles();

  if (suites.length === 0) {
    const msg = agentFilter
      ? `No eval cases found for agent: ${agentFilter}`
      : 'No eval case files found in tools/eval/cases/';
    console.error(`${c.red}${msg}${c.reset}`);
    process.exit(1);
  }

  const results = [];

  for (const suite of suites) {
    if (!jsonOutput) {
      console.log(`\n${c.bold}${c.cyan}${suite.agent}${c.reset}  ${c.grey}(${suite.stack})${c.reset}`);
    }

    for (const testCase of suite.cases) {
      const result = runCase(testCase, suite.agent);
      results.push(result);

      if (!jsonOutput) {
        if (result.status === 'pass') {
          if (verbose) {
            console.log(`  ${c.green}PASS${c.reset}  ${result.id}  ${c.grey}${result.desc}${c.reset}`);
          }
        } else if (result.status === 'skip') {
          console.log(`  ${c.yellow}SKIP${c.reset}  ${result.id}  ${c.grey}${result.reason}${c.reset}`);
        } else {
          console.log(`  ${c.red}FAIL${c.reset}  ${result.id}  ${result.desc}`);
          for (const f of result.failures) {
            if (f.type === 'must_contain') {
              console.log(`         ${c.red}missing:${c.reset} ${JSON.stringify(f.pattern)}`);
            } else {
              console.log(`         ${c.red}present:${c.reset} ${JSON.stringify(f.pattern)}  (must NOT contain)`);
            }
          }
          console.log(`         ${c.grey}file: ${result.file}${c.reset}`);
        }
      }
    }
  }

  // ─── Summary ────────────────────────────────────────────────────────────────
  const passed  = results.filter(r => r.status === 'pass').length;
  const failed  = results.filter(r => r.status === 'fail').length;
  const skipped = results.filter(r => r.status === 'skip').length;
  const total   = results.length;

  if (jsonOutput) {
    console.log(JSON.stringify({ summary: { total, passed, failed, skipped }, results }, null, 2));
  } else {
    const statusLine = failed > 0
      ? `${c.red}${c.bold}FAILED${c.reset}`
      : `${c.green}${c.bold}PASSED${c.reset}`;

    console.log(
      `\n${statusLine}  ` +
      `${c.green}${passed} passed${c.reset}  ` +
      (failed  > 0 ? `${c.red}${failed} failed${c.reset}  ` : '') +
      (skipped > 0 ? `${c.yellow}${skipped} skipped${c.reset}  ` : '') +
      `${c.grey}(${total} total)${c.reset}`
    );

    if (failed > 0) {
      console.log(`\n${c.grey}Fix the examples or update the agent prompt, then re-run npm run eval.${c.reset}`);
    }
  }

  process.exit(failed > 0 ? 1 : 0);
}

main();
