---
name: changelog
description: Auto-generate changelog from git commits — grouped by feat/fix/docs with PR links
category: developer-tools
triggers:
  - "generate changelog"
  - "what changed"
  - "release notes"
---

Auto-generate changelog from git commits.

## How to use
Run in your repo. Reads commits since last tag, groups by type:
✨ Features / 🐛 Bug Fixes / 📝 Docs / ♻️ Refactoring / 🧪 Tests

Works best with conventional commits (feat:, fix:, docs:, etc.).

For full instructions, read `agents/changelog.md`.
