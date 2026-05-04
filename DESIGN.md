# Design

How NeuraForge AI is designed and why.

## Core Idea

Most AI coding tools help you write code faster. NeuraForge helps you write code **consistently** — across teams, stacks, and time.

The insight: the hard part of software development isn't writing code. It's maintaining architecture standards, catching the same bugs in review, onboarding new developers to existing patterns, and ensuring every team follows the same conventions. AI agents can enforce this automatically.

## Architecture

```
┌─────────────────────────────────────────────────┐
│                   User Prompt                    │
│         "Build a CRUD API for orders"            │
└──────────────────────┬──────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────┐
│              AGENTS.md (router)                  │
│   Detects stack → routes to correct agent        │
└──────────────────────┬──────────────────────────┘
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
    ┌──────────┐ ┌──────────┐ ┌──────────┐
    │  Agent   │ │  Rules   │ │   MCP    │
    │ Prompts  │ │  Files   │ │ Servers  │
    │          │ │          │ │          │
    │ agents/  │ │ rules/   │ │.mcp.json │
    │ *.md     │ │ *.md     │ │ 22 tools │
    └──────────┘ └──────────┘ └──────────┘
```

### Three layers

**1. Agent Prompts** (`agents/*.md`) — The instructions. Each agent is a detailed prompt that tells the AI model how to behave for a specific task. They contain code patterns, anti-patterns, decision trees, and examples. These are the core IP.

**2. Rules** (`rules/*.md`) — The standards. Shared across all agents. Architecture principles, naming conventions, security checklists, testing strategy. An agent references rules but doesn't duplicate them.

**3. MCP Servers** (`.mcp.json`) — The tools. External capabilities like Figma access, Swagger parsing, SonarQube analysis, load testing. Agents use these when they need to interact with external systems.

## Design Decisions

### Why markdown files, not code?

Agent prompts are markdown because:
- Every AI platform reads markdown (Claude Code, Cursor, Gemini, Codex)
- No build step, no compilation, no runtime
- Easy to read, review, and modify
- Version controlled with git like any other code
- No vendor lock-in — works with any LLM

### Why one agent per task, not one mega-agent?

A single "do everything" agent would be too large for any model's context window and too vague to be useful. Specialized agents:
- Fit in context (each is 200-800 lines, not 10,000)
- Have specific, testable behavior
- Can be improved independently
- Can be composed (forge → reviewer → test-forge)

### Why plan-before-act?

Every forge agent searches the codebase and presents a plan before generating code. This prevents:
- Duplicating existing components
- Creating files that conflict with existing architecture
- Generating code the user didn't want
- Missing reuse opportunities

### Why 7 stacks with the same principles?

The architecture principles (thin controllers, leaf-level data fetching, no god classes, composition over inheritance) are universal. The implementation differs per stack but the thinking is the same. This means:
- A .NET developer and a NestJS developer follow the same mental model
- Code reviews use the same criteria regardless of stack
- New stack support is additive, not a rewrite

### Why domain-aware?

A financial services app needs SEBI compliance, audit trails, and idempotency. A healthcare app needs HIPAA, PHI encryption, and consent management. Rather than building separate tools per industry, agents adapt based on a single configuration. The domain context is a prompt modifier, not a code change.

### Why skills AND agents?

- **Skills** (`skills/*/SKILL.md`) = entry points. Short descriptions that tell the AI platform when to activate. Like a menu.
- **Agents** (`agents/*.md`) = full instructions. The detailed prompt with patterns, examples, and rules. Like the recipe.

Skills exist because Claude Code's plugin system discovers them. Agents exist because the actual work needs detailed instructions. Other platforms (Cursor, Codex) skip skills and read `AGENTS.md` directly.

## File Naming Conventions

```
agents/forge.md              — .NET code generation
agents/nestjs-forge.md       — NestJS code generation (stack prefix)
agents/dotnet-reviewer.md    — .NET code review (stack + role)
agents/debug.md              — debugging (no stack — works for all)
rules/core/ARCHITECTURE_PRINCIPLES.md  — shared across all stacks
rules/backend/CACHING_PATTERNS.md      — backend-specific
rules/frontend/UX_STATES.md            — frontend-specific
rules/security/RATE_LIMITING.md        — security-specific
```

## What This Is Not

- **Not a framework** — no runtime, no dependencies, no build step
- **Not a SaaS** — nothing hosted, nothing to sign up for
- **Not model-specific** — works with Claude, GPT, Gemini, or any LLM
- **Not a replacement for developers** — it's a tool that enforces standards. Humans make all decisions.

## Evolution

v1 (current): Agent prompts + rules + MCP configs. Works but agents can't self-improve.

Future: Agents that learn from your codebase (via graphify), remember past decisions (via memory MCP), and adapt rules based on team feedback. The architecture supports this — agents already reference external knowledge, they just need better sources.
