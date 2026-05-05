---
name: refactor
description: Point at a file or folder — get it broken down into focused, testable pieces following enterprise patterns
category: developer-tools
triggers:
  - "refactor this"
  - "break down this file"
  - "split this"
---

Break down complex files into focused, testable pieces.

## How to use
Point at a file: "Refactor src/services/OrderService.ts"

The agent will:
1. Analyze responsibilities (how many things does it do?)
2. Plan the split with file names and line estimates
3. Generate focused files, update all imports
4. Generate missing tests for new files

Rule: Components <150 lines, Services <300 lines.

For full instructions, read `agents/refactor.md`.
