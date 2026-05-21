# Neuraforge AI — OpenCode Installation

## Install

```
Fetch and follow instructions from https://raw.githubusercontent.com/vikisingh23/neuraforge-ai/main/.opencode/INSTALL.md
```

## What Gets Installed

- 24+ specialized agents (forge, react-forge, rn-forge, flutter-forge, nestjs-forge, django-forge, spring-forge, architecture-reviewer, product-manager, QA agents, etc.)
- Skills library (git-worktrees, TDD, code-review, debugging, etc.)
- MCP server configs for enhanced tooling

## Manual Setup

1. Clone: `git clone https://github.com/vikisingh23/neuraforge-ai.git ~/.opencode/neuraforge-ai`
2. Copy agents: `cp ~/.opencode/neuraforge-ai/agents/*.md ~/.opencode/agents/`
3. Copy skills: `cp -r ~/.opencode/neuraforge-ai/skills/ ~/.opencode/skills/`

## Usage

Once installed, agents activate contextually:
- Writing .NET code → `forge` patterns apply
- Writing React → `react-forge` patterns apply
- Starting a feature → `feature-pipeline` orchestrates the full flow
- Architecture decisions → `architecture-reviewer` produces 2-3 plans
