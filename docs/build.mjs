#!/usr/bin/env node
import { readdirSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const SAMPLE_PROMPTS = {"forge":["Build a CRUD API for orders with pagination","Add a payment endpoint with idempotency","Generate a report service"],"nestjs-forge":["Create a user module with JWT auth","Build a notification service with Bull queues","Generate a file upload endpoint"],"react-forge":["Create a dashboard with portfolio cards","Build a transaction list with filters","Generate a multi-step form"],"rn-forge":["Create a portfolio screen with pull-to-refresh","Build a biometric login flow","Generate a bottom sheet"],"flutter-forge":["Create a holdings screen with Riverpod","Build a SIP calculator","Generate an onboarding flow"],"django-forge":["Build an order API with Celery","Create a notification scheduler","Generate a report with PDF export"],"spring-forge":["Create a transaction service with locking","Build a batch job with Spring Batch","Generate a REST API with Flyway"],"test-forge":["Generate tests for OrderService","Write e2e tests for auth flow","Create load test scenarios"],"debug":["TypeError: Cannot read property 'map' of undefined","NullReferenceException in line 45","RenderFlex overflow error"],"pr-review":["Review my current branch","Check this PR for security issues","Score against architecture standards"],"scaffold":["New NestJS project with Postgres and Docker","Bootstrap a React app with Vitest","Create a Flutter project with Riverpod"],"refactor":["Break down OrderService.ts (450 lines)","Split this god component","Extract validation logic"],"db-design":["Design schema for users and orders","Add subscription billing model","Create audit log table"],"api-design":["Design REST API for inventory","Create OpenAPI spec for payments","Design webhook endpoints"],"code-review":["Review for architecture violations","Check for security vulnerabilities","Score against coding standards"],"product-manager":["Create BRS for SIP feature","Write user stories for dashboard","Define acceptance criteria"],"devils-advocate":["Challenge this BRS for edge cases","Find regulatory gaps","What could go wrong?"],"design-sync":["Sync DESIGN.md with Figma","Update colors from Figma","What changed since last sync?"]};

const agents = readdirSync(join(ROOT, 'agents'))
  .filter(f => f.endsWith('.md'))
  .map(f => {
    const name = f.replace('.md', '');
    const content = readFileSync(join(ROOT, 'agents', f), 'utf-8');
    const title = (content.match(/^#\s+(.+)/m) || [, name])[1].replace(/[*#]/g, '').trim();
    const lines = content.split('\n').filter(l => l.trim() && !l.startsWith('#') && !l.startsWith('---') && !l.startsWith('```') && !l.startsWith('//'));
    const desc = (lines[0] || '').slice(0, 200);
    
    let category = 'other';
    if (name.includes('forge') && !name.includes('review')) category = 'generation';
    else if (name.includes('review')) category = 'review';
    else if (['debug','pr-review','scaffold','refactor','db-design','api-design','migrate','explain','changelog','deps-audit'].includes(name)) category = 'productivity';
    else if (['product-manager','devils-advocate','feature-pipeline','fullstack-orchestrator'].includes(name)) category = 'product';
    else if (['test-forge','sentinel','load-tester','ui-validator'].includes(name)) category = 'testing';
    else if (['devops','documentation','presentation-builder','video-creator','doc-generator','design-sync'].includes(name)) category = 'infra';
    
    let stack = 'All';
    if (name.includes('dotnet') || name === 'forge') stack = '.NET';
    else if (name.includes('nestjs')) stack = 'NestJS';
    else if (name.includes('django')) stack = 'Django';
    else if (name.includes('spring')) stack = 'Spring';
    else if (name.includes('react') && !name.includes('native') && !name.includes('rn')) stack = 'React';
    else if (name.includes('rn') || name.includes('native')) stack = 'React Native';
    else if (name.includes('flutter')) stack = 'Flutter';
    
    const prompts = SAMPLE_PROMPTS[name] || [`Use /${name} for this task`];
    return { name, title, desc, category, stack, prompts };
  });

const skills = readdirSync(join(ROOT, 'skills')).filter(d => {
  try { readFileSync(join(ROOT, 'skills', d, 'SKILL.md')); return true; } catch { return false; }
});

let template = readFileSync(join(__dirname, 'template.html'), 'utf-8');
template = template.replace('{{AGENTS_JSON}}', JSON.stringify(agents));
template = template.replace(/\{\{AGENT_COUNT\}\}/g, String(agents.length));
template = template.replace(/\{\{SKILL_COUNT\}\}/g, String(skills.length));

writeFileSync(join(__dirname, 'index.html'), template);
console.log("✅ Generated docs/index.html (" + agents.length + " agents, " + skills.length + " skills)");
