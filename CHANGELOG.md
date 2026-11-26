# Changelog

All notable changes to NeuraForge AI are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

### Added
- `rules/core/AGENT_COMMON_RULES.md` and `rules/core/ORCHESTRATION_PROTOCOL.md`: untrusted-content, secrets and definition-of-done rules for all agents; delegation briefs, `Done`/`Failed`/`Blocked` replies, orchestrator-run verification gates, human approval gates, parallelism and capped fix loops for orchestrators
- `tools/normalize-agents` (`npm run normalize:agents`): brings `agents/*.json` to the Kiro v3 schema (tool names, `permissions`, descriptions, faster model on routine agents)
- OWASP Top 10:2025 mapping, SSRF/BOLA, fail-closed and AI/agent/MCP security rules in `rules/security`
- Supply chain rules and runtime baselines (.NET 10 LTS, Node 24 LTS, React Native guidance) in `rules/core/DEPENDENCY_POLICY.md`; modern .NET and React Native baselines in `rules/backend` and `rules/frontend`
- React security floor (never below 19.0.1 / 19.1.2 / 19.2.1 after the Dec 2025 Server Components RCE), React 19.3 and React Compiler baseline, TypeScript 7.x baseline, framework security advisory rule
- npm trusted publishing (OIDC, staged publish) guidance and its runner limits in `rules/core/CICD_PIPELINE.md`
- `AGENTS.md` "Commands" section and nested-file guidance; orchestrators take their verification gates from a project's Commands
- Tool-native installs: Claude Code subagents are generated with the required frontmatter (the raw files were skipped before), Gemini CLI gets `.gemini/agents`, Codex gets `.codex/agents/*.toml` and `.codex/config.toml`, and skills install to `.claude/skills`, `.kiro/skills` and the shared `.agents/skills` (Gemini CLI, Antigravity, Codex). `CLAUDE.md` imports `AGENTS.md`
- `NEURAFORGE_SRC` installs from a local checkout; adapter tests (`npm run test:install`) run in CI

- `rules/core/CODEGEN_CORE.md`: one shared process for all code generators (interactive vs orchestrated mode, plan phase, security by default, verification, `### Result` evidence block, learning loop)
- `tools/verify/post-gen-check.mjs` (`npm run verify:generated`): secret scan of added lines and new-dependency report with unpinned-version warnings; `--audit` runs npm audit and dotnet vulnerability checks
- Behavior evals (`npm run eval:behavior`): 6 task cases (forge, nestjs-forge, react-forge, debug, refactor, security-reviewer injection) run against a real agent and graded deterministically; grader and case golden examples are tested in CI (`npm run test:tools`)

- Behavior evals ran green on Kiro CLI (6/6, `--platform kiro --cmd 'kiro-cli chat --no-interactive ...'`). They found and fixed: generators ignored the `### Result` block because `AGENTS.md` said to end with the feedback-log line (Result now first, feedback line after, block also inline in each generator's `Finish (required)` section); a too-strict route check. The runner now reports CLI/model failures as errors, not agent failures, and has `--show-reply`

### Changed
- Code generators slimmed from 545-788 lines to 175-535: duplicated plan phase replaced by `CODEGEN_CORE`, code templates moved to `skills/<stack>/references/` (loaded on demand), emphatic ALWAYS/NEVER/MANDATORY wording replaced by plain rules
- `debug` is reproduce-first with a failing test and a verified fix; `refactor` requires a green (or characterization-test) baseline; `scaffold` verifies install, build, tests and a health check
- `rn-forge` and `react-forge` follow React Compiler (no default memoization when it is enabled); `nestjs-forge` stack preference follows `.neuraforge.yml` instead of "always"
- Reviewers are read-only (no write or shell); the orchestrator saves their findings to `06-reviews/`
- `forge.md` code and payment templates moved to `skills/dotnet-forge/references/` and load on demand
- `fullstack-orchestrator` rewritten: contract-first, architecture approval gate before any code, parallel backend/frontend build, verification gate, review fix loop
- `feature-pipeline` passes `architecture_approved: true` to generators, runs build/test gates itself, and builds against an API contract
- Orchestrators and generators that delegate now have the `subagent` tool in their configs
- `security-reviewer` checks access control (BOLA/IDOR, SSRF), supply chain, fail-closed handling, integrity/logging and AI/agent code, and treats reviewed content as data
- `feature-pipeline`: stage diagram matches the stages, tests live in the repo with a manifest, one combined parallel review with a capped fix loop, `Failed`/`Blocked` handling, resume rules
- Every agent prompt points at `rules/core/AGENT_COMMON_RULES.md`
- Skills `git-worktrees` and `workspace-protocol` gained the `name`/`description` frontmatter required by the Agent Skills format
- Docker/CI examples use `node:24-alpine` and .NET 10 images; `forge`, `devops`, `migrate` target .NET 10 LTS for new services

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
