#!/usr/bin/env node
/**
 * normalize-agents: bring agents/*.json to the Kiro CLI v3 schema without touching the prompts.
 *
 *   - tool names: fs_read/fs_write/execute_bash/use_subagent -> read/write/shell/subagent
 *   - adds $schema, description (from the agent's .md), allowedTools, permissions
 *   - sets a faster model on routine review/test/doc agents (override: --no-model)
 *   - idempotent. Dry run by default.
 *
 * Usage: node tools/normalize-agents/index.mjs [--write] [--no-model]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const WRITE = process.argv.includes('--write');
const NO_MODEL = process.argv.includes('--no-model');
const AGENTS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'agents');
const SCHEMA = 'https://raw.githubusercontent.com/aws/amazon-q-developer-cli/refs/heads/main/schemas/agent-v1.json';
const TOOL_MAP = { fs_read: 'read', fs_write: 'write', execute_bash: 'shell', use_subagent: 'subagent' };
const FAST_MODEL = 'claude-sonnet-4.6';
// Routine review / test / doc agents. Generators, orchestrators and architecture/security reviewers keep the default model.
const FAST_AGENTS = new Set([
  'django-reviewer', 'dotnet-reviewer', 'flutter-reviewer', 'nestjs-reviewer', 'performance-reviewer', 'react-reviewer', 'rn-reviewer', 'spring-reviewer',
  'changelog', 'deps-audit', 'doc-generator', 'documentation', 'explain', 'api-design', 'qa-agent', 'sentinel', 'load-tester',
  'presentation-builder', 'ui-validator', 'design-sync', 'video-creator', 'pr-review',
]);

// Agents whose prompts delegate to other agents need the sub-agent tool (it was missing from their configs).
const DELEGATING = new Set(['feature-pipeline', 'fullstack-orchestrator', 'forge', 'react-forge', 'rn-forge', 'flutter-forge']);

function describe(md) {
  const lines = md.split('\n').map((l) => l.trim());
  const mission = lines.find((l) => /^\*\*Your Mission:?\*\*/i.test(l));
  let t = mission
    ? mission.replace(/^\*\*Your Mission:?\*\*:?\s*/i, '')
    : lines.find((l) => l && !/^(#|---|\||```|>)/.test(l));
  t = (t || '').replace(/\*\*/g, '').replace(/`/g, '').replace(/^You are\s+/i, '');
  t = t.charAt(0).toUpperCase() + t.slice(1);
  return t.length > 220 ? t.slice(0, 217).replace(/\s+\S*$/, '') + '...' : t;
}

let changed = 0;
const files = fs.readdirSync(AGENTS).filter((f) => f.endsWith('.json')).sort();
for (const f of files) {
  const name = f.slice(0, -5);
  const p = path.join(AGENTS, f);
  const cfg = JSON.parse(fs.readFileSync(p, 'utf8'));
  const mdPath = path.join(AGENTS, `${name}.md`);
  const md = fs.existsSync(mdPath) ? fs.readFileSync(mdPath, 'utf8') : '';

  const out = { $schema: cfg.$schema || SCHEMA, name: cfg.name || name, description: cfg.description || describe(md) };
  if (cfg.prompt || md) out.prompt = cfg.prompt || `file://${name}.md`;
  const skip = ['$schema', 'name', 'description', 'prompt', 'tools', 'allowedTools', 'permissions', 'subagents', 'model', 'kiroUpgrade'];
  for (const k of Object.keys(cfg)) if (!skip.includes(k)) out[k] = cfg[k];
  const model = cfg.model || (!NO_MODEL && FAST_AGENTS.has(name) ? FAST_MODEL : undefined);
  if (model) out.model = model;
  out.tools = [...new Set([...(cfg.tools || []).map((t) => TOOL_MAP[t] || t), ...(DELEGATING.has(name) ? ['subagent'] : [])])];
  if (cfg.subagents) out.subagents = cfg.subagents;
  out.allowedTools = cfg.allowedTools || [];
  out.permissions = cfg.permissions || { rules: [{ capability: 'fs_read', match: ['./**'], effect: 'allow' }] };
  if (cfg.kiroUpgrade) out.kiroUpgrade = cfg.kiroUpgrade;

  const text = JSON.stringify(out, null, 2) + '\n';
  if (text !== fs.readFileSync(p, 'utf8')) {
    changed++;
    console.log(`${WRITE ? '' : '[dry-run] '}${f}`);
    if (WRITE) fs.writeFileSync(p, text);
  }
}
console.log(`${files.length} agents, ${changed} ${WRITE ? 'rewritten' : 'would change (use --write)'}`);
