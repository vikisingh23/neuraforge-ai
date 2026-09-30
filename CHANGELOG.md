# Changelog

All notable changes to NeuraForge AI are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

### Added
- `.neuraforge.yml` project config — teams can pin version, set domain, toggle agents, customize line limits, and enable/disable MCP integrations without editing agent files
- All 22 MCP packages pinned to exact versions in `.mcp.json` — no more `@latest` in production configs
- `install.mjs` — `--dry-run` flag, `--doctor` health check, proper error surfacing (no more silent failures), input validation against known platforms, directory-based platform detection as primary method
- `package.json` at repo root — `npm run install:cursor`, `npm run doctor`, etc.
- GitHub issue templates (bug report, new agent proposal) and PR template
- `agents/_TEMPLATE.md` — contributor template for new agents with mandatory sections
- `examples/` directory — one complete generated output per stack showing real patterns
- Stack maturity labels in README (`stable` / `beta`)
- GitHub Discussions link in issue templates and CONTRIBUTING.md
- `validate.yml` — cross-reference checks, `@latest` regression guard, AGENTS.md consistency, YAML validation

### Fixed
- `install.sh` — synced with `install.mjs`: error handling, `--dry-run`, `--doctor`, platform validation
- `install.mjs` — `--progress` flag on git clone so downloads don't look frozen
- `validate.yml` — replaced fragile `ls | wc -l` with portable `find` counts

---

## [1.0.0] — 2026-09-01

### Added
- **40 agents** across 7 stacks: .NET, NestJS, Django, Spring Boot, React, React Native, Flutter
- **35 skills** for all major development workflows
- **22 MCP servers**: design, frontend, mobile, quality, media, documents, testing, GitHub
- **8-stage feature pipeline**: requirements → architecture → code → review → test → deploy
- Product Manager agent with PRD generation and Figma screen workflow (`feat: product-manager`)
- Workspace protocol skill for file-based agent communication
- TDD enforcement — test-forge writes tests before forge implements (`feat: TDD enforcement`)
- Git worktrees support for multi-platform environments
- Architecture design gate with cloud mobile testing
- Design-sync agent that reads Figma and updates `DESIGN.md` tokens
- Material Design 3 (MUI) design system in `DESIGN.md`
- Kiro CLI agent configs (`.json`) for all 40 agents
- Hermes-compatible skills (agentskills.io standard)
- Cross-platform installer: `install.mjs` (Node.js) + `install.sh` (Bash)
- Static agent catalog site with search and filters
- Domain presets: Financial Services India, Stock Broking India, Lending India, E-Commerce
- Support for 12 AI platforms: Claude Code, Cursor, Gemini, Copilot, Kiro, OpenCode, Codex, Windsurf, Cline, Continue.dev, Aider, ChatGPT Custom GPT

### Fixed
- `@neuraforge/office-mcp` — use `--pptx`/`--docx`/`--xlsx` flags correctly
- Removed broken MCP servers (expo, flutter-mcp)
- README counts corrected to 40 agents, 22 MCP servers, 12 platforms

---

## How versions work

NeuraForge AI uses **date-based versioning** for the main branch. The `version` field in `.neuraforge.yml` lets teams pin to a specific git tag so agent behavior stays consistent across their organization even as the project evolves.

To pin your team to a specific release:
```yaml
# .neuraforge.yml
version: "1.0.0"   # pin to this git tag
```

To upgrade:
```bash
git -C ~/.neuraforge-ai pull
# or re-run: node install.mjs
```
