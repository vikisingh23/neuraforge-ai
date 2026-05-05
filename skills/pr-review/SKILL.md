---
name: pr-review
description: Review current branch changes — reads git diff, runs stack-appropriate review, outputs structured feedback
category: code-quality
triggers:
  - "review my pr"
  - "review this branch"
  - "check my code"
---

Review current branch changes against base branch.

## How to use
Run on your feature branch. The agent will:
1. Read all changed files (full context, not just diff)
2. Apply stack-appropriate review rules
3. Check architecture, security, performance, testing
4. Output structured review with score (0-100)

Format: 🔴 Critical / 🟡 Major / 🟢 Minor / 💡 Suggestions

For full instructions, read `agents/pr-review.md`.
