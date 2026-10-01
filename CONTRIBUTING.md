# Contributing

Thanks for your interest in contributing to the Agentic Dev Platform!

## How to Contribute

### Adding a New Agent
1. Create `agents/your-agent.md` with the agent prompt
2. Create `skills/your-skill/SKILL.md` with the skill entry point
3. If the agent needs MCP servers, add them to `.mcp.json`
4. Update README.md with the new agent

### Adding a New MCP Server
1. Verify the npm package exists: `npm view package-name version`
2. Add to `.mcp.json` using `npx -y` format (no local paths)
3. Test it works on Mac, Windows, and Linux

### Improving Existing Agents
1. Read the existing agent prompt in `agents/`
2. Make your changes — keep the same structure
3. Ensure no company-specific references (use generic terms)
4. Test with Claude Code or Kiro CLI

## Guidelines

- **No company-specific content** — keep everything generic and reusable
- **No secrets or tokens** — use `userConfig` or environment variables
- **Cross-platform** — must work on Windows, Mac, Linux
- **npx only** — MCP servers must use `npx -y`, no local file paths
- **Conventional commits** — `feat:`, `fix:`, `docs:`, `refactor:`

## Questions and Discussion

- **Questions / ideas** → [GitHub Discussions](https://github.com/vikisingh23/neuraforge-ai/discussions)
- **Bug reports** → [GitHub Issues](https://github.com/vikisingh23/neuraforge-ai/issues) (use the bug report template)
- **New agent proposals** → [GitHub Issues](https://github.com/vikisingh23/neuraforge-ai/issues) (use the new agent template)

## New Agent Template

When creating a new agent, start from `agents/_TEMPLATE.md`. It has all the mandatory sections:
plan phase, workflow, code patterns, rules, domain awareness, and post-generation review.

## Maintainer Setup Checklist

If you fork this repo and want the full experience working, enable these GitHub features in repo **Settings**:

- **Discussions** (Settings → General → Features → Discussions) — Questions, ideas, and show-and-tell go here. The issue templates already redirect to Discussions; enabling this makes the redirect live.
- **Issues** — Already on by default.
- **Dependabot** — Already configured in `.github/dependabot.yml`; will auto-open PRs for MCP version bumps once the repo is public.

## Code of Conduct

Be respectful, constructive, and inclusive. We're all here to build better tools.
