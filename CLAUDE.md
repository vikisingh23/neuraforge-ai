# NeuraForge AI — Claude Code Instructions

Read `AGENTS.md` for full agent instructions and architecture principles.

## Hub & Blade Architecture

This project uses a Unified Hub MCP server (`mcp/hub.mjs`) providing shared services:
- **State Blade** (`state_*`) — pipeline state, advance/loop logic
- **Governance Blade** (`govern_*`) — permission enforcement, handoff validation
- **Analytics Blade** (`analytics_*`) — event logging
- **Critical Blade** (`critical_*`) — critical items accumulation engine
- **Lock Blade** (`lock_*`) — cross-pipeline mutual exclusion

The Hub is a TOOLBOX. The `feature-pipeline` agent is the orchestrator — it follows a deterministic checklist and calls Hub tools for enforcement.

## Handoff Protocol
All inter-agent communication uses `handoff/v3` YAML frontmatter. See `rules/core/HANDOFF_PROTOCOL.md`.

## Standards
- Architecture rules: `rules/`
- Pipeline definition: `skills/feature-pipeline/pipeline.yaml`
- Governance config: `.neuraforge/governance.yaml`
