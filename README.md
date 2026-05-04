<p align="center">
  <h1 align="center">🧠 NeuraForge AI</h1>
  <p align="center">
    <strong>Describe a feature in plain English. Get code that follows enterprise patterns.</strong>
  </p>
  <p align="center">
    <a href="LICENSE"><img src="https://img.shields.io/badge/license-Apache%202.0-blue.svg" alt="License"></a>
    <img src="https://img.shields.io/badge/agents-39-blueviolet" alt="39 Agents">
    <img src="https://img.shields.io/badge/MCP%20servers-22-orange" alt="22 MCP Servers">
    <img src="https://img.shields.io/badge/skills-35-green" alt="35 Skills">
    <img src="https://img.shields.io/badge/stacks-7-red" alt="7 Stacks">
    <img src="https://img.shields.io/badge/platform-Windows%20%7C%20Mac%20%7C%20Linux-lightgrey" alt="Cross-platform">
  </p>
  <p align="center">
    <a href="#install">Install</a> · <a href="#what-can-it-do">What Can It Do</a> · <a href="#the-pipeline">The Pipeline</a> · <a href="SKILLS.md">All Skills</a>
  </p>
</p>

---

<p align="center">
  <img src="assets/demo.png" alt="NeuraForge AI Demo" width="100%">
</p>

## Install

**Auto-detect** (runs in your project directory):
```bash
curl -fsSL https://raw.githubusercontent.com/vikisingh23/neuraforge-ai/main/install.sh | bash
```

Or install for a specific platform:

<details>
<summary><strong>Claude Code</strong></summary>

```bash
/plugin marketplace add vikisingh23/neuraforge-ai
/plugin install neuraforge-ai
```
</details>

<details>
<summary><strong>Cursor</strong></summary>

Import rules from GitHub: Settings → Rules → Import → `https://github.com/vikisingh23/neuraforge-ai.git`

Or manually: clone the repo and copy `.cursor/` to your project.
</details>

<details>
<summary><strong>Gemini CLI</strong></summary>

Clone and copy `.gemini/settings.json` + `AGENTS.md` to your project. Gemini auto-discovers both.
</details>

<details>
<summary><strong>GitHub Copilot CLI</strong></summary>

Copy `AGENTS.md` to your project root. Copilot reads it automatically.
</details>

<details>
<summary><strong>Codex / OpenCode / Kiro CLI</strong></summary>

Copy `AGENTS.md` + `agents/` + `rules/` to your project. All three auto-discover `AGENTS.md`.

Kiro: `kiro-cli chat --agent forge`
</details>

Works on Windows, Mac, Linux. Needs Node.js 18+.

---

## What Can It Do

| You say... | NeuraForge does... |
|-----------|-----------------|
| "Build a CRUD API for orders" | Generates Entity + DTO + Repo + Service + Controller + Tests + Migration |
| "Create a dashboard screen from this Figma" | Generates React/RN/Flutter screen matching the design |
| "Review my PR" | Reads git diff, runs 5 reviewers in parallel, scores 0-100 |
| "This is broken" + paste error | Reads the file, diagnoses root cause, shows the fix |
| "Bootstrap a new NestJS project" | Full project with auth, Docker, CI/CD, health checks |
| "Break down this 500-line file" | Splits into focused, testable pieces, updates all imports |
| "Design a database for users and orders" | ERD + entities + migrations + indexes |
| "Generate a changelog" | Reads git commits, groups by feat/fix/docs |
| "Create a presentation about X" | Generates PPTX with professional formatting |
| "Make a video intro for our product" | Remotion-based video with animations |

---

## The Pipeline

An 8-stage system that takes a feature from idea to production:

<p align="center">
  <img src="assets/pipeline.png" alt="NeuraForge AI — 8-Stage Pipeline" width="100%">
</p>

Each stage works independently too — use what you need.

---

## 7 Stacks

| Stack | Generate | Review | Test |
|-------|----------|--------|------|
| **.NET Core** | `forge` | `dotnet-reviewer` | xUnit + Moq |
| **NestJS + TypeORM** | `nestjs-forge` | `nestjs-reviewer` | Jest + supertest |
| **Django + DRF** | `django-forge` | `django-reviewer` | pytest + DRF test |
| **Spring Boot + JPA** | `spring-forge` | `spring-reviewer` | JUnit 5 + Mockito |
| **React** | `react-forge` | `react-reviewer` | Vitest + RTL |
| **React Native** | `rn-forge` | `rn-reviewer` | Jest + RNTL |
| **Flutter** | `flutter-forge` | `flutter-reviewer` | flutter_test + mocktail |

---

## Domain Aware (optional)

On install, tell NeuraForge your industry. Agents adapt automatically:

```
Industry: financial-services
Country: india
→ Agents now know SEBI regulations, KYC flows, ₹ formatting
```

Presets: **Financial Services** (India/US/UK/EU) · **Healthcare** (HIPAA/GDPR) · **E-Commerce** · **SaaS**

Skip for generic enterprise patterns.

---

## Architecture Principles

Enforced across all 7 stacks by every forge and reviewer:

- 🎯 **Leaf-level data fetching** — no parent prop-drilling
- ♻️ **Reuse → extend → refactor → create** — never duplicate
- 📏 **No god classes** — controllers <150, services <300, components <150 lines
- 🧩 **Composition over inheritance**
- ❤️ **Loading / error / empty states** on every screen
- 🔍 **Pixel-perfect** from Figma, edge cases handled

---

## Full Inventory

<details>
<summary><strong>35 Skills</strong> (click to expand)</summary>

**Code Generation**: dotnet-forge, nestjs-forge, react-forge, rn-forge, flutter-forge, test-forge

**Code Review**: code-review, security-review, architecture-review, performance-review, ui-validation

**Developer Productivity**: debug, pr-review, scaffold, refactor, db-design

**Design & Docs**: api-design, doc-generator, video-creator

**Migration & Maintenance**: migrate, explain, changelog, deps-audit

**Testing & QA**: api-testing, load-testing

**Product & Planning**: product-manager, devils-advocate, feature-pipeline, fullstack-orchestrator

**Infrastructure & Setup**: devops, documentation, presentation-builder, domain-setup

</details>

<details>
<summary><strong>22 MCP Servers</strong> (click to expand)</summary>

**Design**: Figma DevMode, MUI
**Frontend**: Vite React, Storybook, ReactBits
**Mobile**: Expo, Cali, Gluestack UI, Dart/Flutter, Flutter
**Backend**: Swagger, OpenAPI
**Quality**: SonarQube, Playwright, a11y
**Media**: Remotion, FFmpeg, Media Processor, Short Video Maker
**Documents**: @neuraforge/office-mcp (PPTX, DOCX, XLSX)

</details>

---

## Contributing

PRs welcome! See [CONTRIBUTING.md](CONTRIBUTING.md).

## Acknowledgements

- Codebase knowledge graph powered by [graphify](https://github.com/safishamsi/graphify) by Safi Shamsi

## License

Apache 2.0

---

<p align="center">
  <strong>Built by <a href="https://github.com/vikisingh23">Vikas Singh</a></strong>
</p>

---

## Limitations & Honest Notes

This is a v1. Here's what to expect:

- **Agents are sophisticated prompts, not autonomous systems.** They guide AI models to follow patterns — they don't self-correct or chain actions independently. Quality depends on the underlying model.
- **Line limits are opinionated.** The "controllers <150 lines" rule works for our teams. Your mileage may vary. Treat these as starting points, not gospel.
- **.NET and React agents are the most battle-tested.** Django and Spring Boot agents are newer and less proven in production. Feedback welcome.
- **Domain presets are starting points.** The AI adapts based on its training data + your configuration. It won't replace a compliance expert.
- **MCP servers are curated, not built by us.** We configure and test existing open-source MCP servers. The value is in the agent prompts and architecture rules.

We'd rather ship something useful and iterate with the community than wait for perfection.

<details>
<summary><strong>Windsurf</strong></summary>

Copy `.windsurfrules` + `AGENTS.md` + `agents/` + `rules/` to your project. Windsurf reads `.windsurfrules` automatically.
</details>

<details>
<summary><strong>Cline (VS Code)</strong></summary>

Copy `.cline/mcp.json` + `.clinerules` + `AGENTS.md` + `agents/` to your project.
</details>

<details>
<summary><strong>Continue.dev</strong></summary>

Copy `.continue/config.json` + `AGENTS.md` + `agents/` to your project.
</details>

<details>
<summary><strong>Aider</strong></summary>

Copy `.aider.conf.yml` + `AGENTS.md` + `agents/` to your project. Aider reads conventions automatically.
</details>

<details>
<summary><strong>ChatGPT (Custom GPT)</strong></summary>

See `chatgpt/README.md` for setup. Copy `chatgpt/GPT_INSTRUCTIONS.md` into your Custom GPT's instructions field.
</details>
