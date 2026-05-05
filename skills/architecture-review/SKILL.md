---
name: architecture-review
description: Review layer separation, design patterns, DI, and module boundaries
category: code-quality
triggers:
  - "review architecture"
  - "check patterns"
  - "architecture audit"
---

Review code architecture and design patterns.

## What it checks
- Layer separation (controller → service → repository)
- Dependency injection usage
- Module boundaries (no cross-boundary DB access)
- Single responsibility (line limits, god class detection)
- Composition over inheritance

For full instructions, read `agents/architecture-review.md`.
