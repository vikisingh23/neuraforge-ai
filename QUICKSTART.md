# NeuraForge AI — Quickstart (5 minutes)

## Step 1: Install (30 seconds)

Open a terminal in your project folder (Windows, macOS or Linux, Node.js 18+) and run:

```bash
npx neuraforge-ai            # configures every supported tool found on this machine
npx neuraforge-ai claude     # or pick one: kiro | gemini | codex | antigravity | cursor | copilot | opencode | hermes
```

Preview first with `--dry-run`. Restart your tool afterwards so it picks up the new agents.

**Claude Code plugin instead:**
```bash
/plugin marketplace add vikisingh23/neuraforge-ai
/plugin install neuraforge-ai
```

## Step 2: Try These (pick your stack)

### Debug something (any stack)
```
Paste any error message or stack trace.
The agent reads the file, diagnoses the root cause, and shows the fix.
```

### Generate a backend API
```
Build a CRUD API for a "Product" entity with name, price, category, and stock.
Include pagination, validation, and soft deletes.
```
→ Generates: Entity + DTO + Repository + Service + Controller + Tests + Migration

### Generate a React component
```
Create a product listing page with search, filters, and pagination.
Use React Query for data fetching.
```
→ Generates: Component + Hook + QueryOptions + Service + Tests

### Review your code
```
Review the code in src/services/OrderService.ts
```
→ Scores 0-100 with Critical/Major/Minor/Suggestions

### Scaffold a new project
```
Create a new NestJS project with PostgreSQL, JWT auth, Swagger docs, and Docker.
```
→ Generates complete project: auth, health check, base entity, Docker, CI/CD, tests

## Step 3: Configure Your Domain (optional)

```
/domain-setup
```
Tell it your industry (financial services, healthcare, e-commerce, SaaS) and country. All agents adapt automatically.

## What to Try Next

| Skill | What it does |
|-------|-------------|
| `/refactor` | Break down a large file into focused pieces |
| `/db-design` | "I need users, orders, and payments" → schema + migrations |
| `/pr-review` | Review your current branch changes |
| `/deps-audit` | Scan for outdated, vulnerable, unused dependencies |
| `/explain` | Point at a folder → get onboarding documentation |

## Full Skill List

See [SKILLS.md](SKILLS.md) for all 35 skills.
