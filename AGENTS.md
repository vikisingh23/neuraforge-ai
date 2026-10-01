# NeuraForge AI — Agent Instructions

You have access to the NeuraForge AI development platform. Use these agents and rules when working on this codebase.

## How to Use

When the user asks you to generate code, review code, debug, scaffold, or any development task — follow the appropriate agent instructions below. Always search the codebase before generating new code.

## Plan Before Acting

Before writing any code:
1. Search the codebase for existing similar code
2. Identify what to reuse, extend, or refactor
3. Present a brief plan and wait for approval
4. Then execute

## Feedback Protocol (MANDATORY — how agents learn)

Read `rules/core/FEEDBACK_PROTOCOL.md` in full. Every code-generating agent must:

1. **Before generating** — load `rules/anti-patterns/{stack}.md` and apply every rule listed
2. **Before generating** — check if `.neuraforge/lessons.md` exists; if so, read and apply project-specific rules
3. **After generating** — write a feedback log to `.neuraforge/feedback/{agent}-{YYYYMMDD}-{id}.md`
4. **Tell the user** — at the end of every response, show the feedback log path and how to flag mistakes

This is how the agents improve. Every corrected feedback item becomes a new anti-pattern rule.

## Architecture Principles (enforce on ALL code)

- **Data fetching at the leaf level** — each component/widget fetches its own data, no parent prop-drilling
- **Reuse → Extend → Refactor → Create** — never duplicate. Search first.
- **No god classes** — controllers <150 lines, services <300, components <150
- **Composition over inheritance** — DI composition, max 1 level of inheritance
- **Consistent error handling** — standard response envelope, domain exceptions
- **Audit everything** — createdBy, modifiedBy, createdAt, modifiedAt, soft deletes
- **Pagination on all lists** — never return unbounded collections
- **Loading / Error / Empty states** — on every data-driven screen
- **API URL paths: always lowercase-hyphenated (kebab-case)** — `/api/v1/bank-accounts`, `/api/v1/transaction-history`, NOT `/api/v1/BankAccounts` or `/api/v1/bankAccounts`. Enforced across ALL stacks (.NET, NestJS, Django, Spring Boot, React, RN, Flutter).

## Code Generation

When asked to generate code, detect the stack using the signals below, then follow the corresponding agent.

### Stack Detection (content-based — check in order)

Use these file/content signals. Extension alone is not enough.

| Signal | Stack |
|--------|-------|
| `*.csproj` present **or** `*.cs` imports `Microsoft.AspNetCore` | **.NET Core** |
| `package.json` contains `"@nestjs/core"` | **NestJS** |
| `package.json` contains `"react-native"` | **React Native** |
| `package.json` contains `"react"` (and not RN above) | **React** |
| `requirements.txt` / `*.py` imports `from rest_framework` | **Django + DRF** |
| `requirements.txt` / `*.py` imports `from fastapi` | **FastAPI** (use `django-forge` as base, note FastAPI differences) |
| `pom.xml` contains `spring-boot` **or** `build.gradle` contains `org.springframework.boot` | **Spring Boot** |
| `pubspec.yaml` present **or** `*.dart` files present | **Flutter** |

**Tie-break rules:**
- If `package.json` exists but no framework import is visible yet, ask the user which backend framework (NestJS vs plain Express vs other).
- If both `.csproj` and `package.json` exist, generate for both and separate the output by stack.
- When in doubt, state your detected stack and ask for confirmation before generating.

### Agents by Stack

#### Backend
- **.NET Core** → Read `agents/forge.md` — EF Core, CQRS, Repository Pattern, FluentValidation
- **NestJS** → Read `agents/nestjs-forge.md` — TypeORM, Guards, Interceptors, Modules
- **Django** → Read `agents/django-forge.md` — DRF, BaseRepository, Celery, Serializers
- **Spring Boot** → Read `agents/spring-forge.md` — JPA, MapStruct, Jakarta Validation, Flyway

#### Frontend / Mobile
- **React** → Read `agents/react-forge.md` — React Query mandatory, Design Tokens
- **React Native** → Read `agents/rn-forge.md` — Typed Navigation, Platform-Aware
- **Flutter** → Read `agents/flutter-forge.md` — Riverpod, Freezed, GoRouter

### Testing
- **Unit/Integration tests** → Read `agents/test-forge.md` — TDD, auto-detects stack, generates unit + integration tests
- **E2E / QA** → Read `agents/qa-agent.md` — web, mobile, API, cross-platform E2E testing (mode auto-detected)

## Code Review

When asked to review code, use the Stack Detection table above, then load:
- **.NET** → Read `agents/dotnet-reviewer.md`
- **NestJS** → Read `agents/nestjs-reviewer.md`
- **Django** → Read `agents/django-reviewer.md`
- **Spring Boot** → Read `agents/spring-reviewer.md`
- **React** → Read `agents/react-reviewer.md`
- **React Native** → Read `agents/rn-reviewer.md`
- **Flutter** → Read `agents/flutter-reviewer.md`
- **Architecture** → Read `agents/architecture-reviewer.md`
- **Security** → Read `agents/security-reviewer.md`
- **Performance** → Read `agents/performance-reviewer.md`

Score 0-100. Format: 🔴 Critical / 🟡 Major / 🟢 Minor / 💡 Suggestions.

## Developer Productivity

- **Debug** → Read `agents/debug.md` — paste error, get diagnosis + fix
- **PR Review** → Read `agents/pr-review.md` — review git diff, structured output
- **Scaffold** → Read `agents/scaffold.md` — bootstrap new project
- **Refactor** → Read `agents/refactor.md` — break down god classes
- **DB Design** → Read `agents/db-design.md` — plain English → schema + migrations
- **API Design** → Read `agents/api-design.md` — requirements → OpenAPI spec
- **Migrate** → Read `agents/migrate.md` — framework upgrades, language conversions
- **Explain** → Read `agents/explain.md` — codebase documentation
- **Changelog** → Read `agents/changelog.md` — git commits → formatted changelog
- **Deps Audit** → Read `agents/deps-audit.md` — outdated, vulnerable, unused deps

## Product & Planning

- **Product Manager** → Read `agents/product-manager.md` — BRS, user stories
- **Devil's Advocate** → Read `agents/devils-advocate.md` — challenge requirements

## Rules

Shared standards are in the `rules/` directory:
- `rules/core/ARCHITECTURE_PRINCIPLES.md` — universal principles
- `rules/core/NAMING_CONVENTIONS.md` — naming standards (if present)
- `rules/core/ERROR_TAXONOMY.md` — HTTP codes, error response format
- `rules/core/TESTING_STRATEGY.md` — test pyramid, coverage targets
- `rules/backend/` — API design, caching, queues, migrations
- `rules/frontend/` — UX states, state management
- `rules/security/` — token hygiene, rate limiting, security checklist

## Codebase Knowledge Graph (optional)

If graphify is installed, use it for deeper understanding:
```
/graphify .
/graphify query "what connects X to Y?"
/graphify explain "ClassName"
```

## MCP Servers

This project has MCP servers configured in `.mcp.json`. Use them when available for Figma design access, Swagger/OpenAPI specs, SonarQube analysis, Playwright testing, and more.
