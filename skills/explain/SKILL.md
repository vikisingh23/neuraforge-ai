---
name: explain
description: Point at a file or folder — get documentation explaining what it does, data flow, and key decisions
category: developer-tools
triggers:
  - "explain this code"
  - "document this"
  - "what does this do"
---

Generate documentation for files, folders, or entire projects.

## How to use
Point at code: "Explain src/modules/order/"

Outputs: purpose, dependencies, public API, data flow, key decisions, gotchas.
For folders: architecture diagram, entry points, how to extend.
For projects: tech stack, getting started, folder guide, key flows.

For full instructions, read `agents/explain.md`.
