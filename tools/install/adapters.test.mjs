import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { toClaudeAgent, toGeminiAgent, toCodexAgentToml, mcpToCodexToml, claudeTools, MAIN_THREAD_ONLY } from './adapters.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const cfg = { description: 'Reviews "code" for\nbugs', tools: ['read', 'write', 'shell', 'code', 'grep', 'glob', 'subagent'], model: 'claude-sonnet-4.6' };

test('claude agent has frontmatter, mapped tools, model and the full prompt', () => {
  const out = toClaudeAgent('dotnet-reviewer', cfg, '# Title\n\nBody\n');
  assert.match(out, /^---\nname: dotnet-reviewer\n/);
  assert.match(out, /description: "Reviews \\"code\\" for bugs"/);
  assert.match(out, /tools: Read, Write, Edit, Bash, Grep, Glob\n/);
  assert.match(out, /model: sonnet\n---\n# Title/);
  assert.ok(!out.includes('Task'), 'subagents cannot spawn subagents');
});

test('claude tool mapping handles MCP tools and drops unknown tools', () => {
  assert.deepEqual(claudeTools(['@figma/get_file', 'code', 'web']), ['mcp__figma__get_file', 'WebFetch', 'WebSearch']);
});

test('gemini agent slug and kind', () => {
  const out = toGeminiAgent('Security Reviewer', cfg, 'Body');
  assert.match(out, /name: security-reviewer\n/);
  assert.match(out, /kind: local\n---\nBody\n$/);
});

test('codex agent toml has the three required fields', () => {
  const out = toCodexAgentToml('security-reviewer', cfg, 'Line 1\nLine 2');
  assert.match(out, /^name = "security_reviewer"\n/);
  assert.match(out, /description = "Reviews \\"code\\" for bugs"\n/);
  assert.match(out, /developer_instructions = '''\nLine 1\nLine 2\n'''\n/);
});

test('codex toml falls back to an escaped string when the body contains the literal delimiter', () => {
  const out = toCodexAgentToml('x', cfg, "has ''' inside");
  assert.match(out, /developer_instructions = "has \x27\x27\x27 inside"/);
});

test('mcp to codex toml: command, args, url, env names only', () => {
  const out = mcpToCodexToml({ mcpServers: { a: { command: 'npx', args: ['-y', 'p@1'], env: { TOKEN: 'secret' } }, 'b.c': { url: 'https://x/mcp' } } });
  assert.match(out, /\[mcp_servers\.a\]\ncommand = "npx"\nargs = \["-y", "p@1"\]\n# requires env: TOKEN/);
  assert.match(out, /\[mcp_servers\."b\.c"\]\nurl = "https:\/\/x\/mcp"/);
  assert.ok(!out.includes('secret'));
});

test('every shipped agent converts for every tool, and orchestrators are flagged main-thread only', () => {
  const dir = join(ROOT, 'agents');
  const names = readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5));
  assert.ok(names.length >= 40);
  for (const n of names) {
    const c = JSON.parse(readFileSync(join(dir, `${n}.json`), 'utf8'));
    const md = readFileSync(join(dir, `${n}.md`), 'utf8');
    assert.ok(c.description, `${n} has a description`);
    assert.match(toClaudeAgent(n, c, md), /^---\nname: /);
    assert.match(toGeminiAgent(n, c, md), /^---\nname: /);
    assert.match(toCodexAgentToml(n, c, md), /^name = /);
  }
  assert.ok(MAIN_THREAD_ONLY.has('feature-pipeline') && MAIN_THREAD_ONLY.has('fullstack-orchestrator'));
});
