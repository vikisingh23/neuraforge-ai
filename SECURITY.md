# Security Policy

## What NeuraForge AI Does and Doesn't Do

### ✅ What it does
- Provides AI agent prompts (markdown files) that guide code generation and review
- Configures MCP servers that run locally on your machine
- All processing happens locally — agents run in your IDE/terminal

### ❌ What it doesn't do
- Does NOT collect, transmit, or store your code
- Does NOT phone home or send telemetry
- Does NOT require an account or API key (except optional Figma token)
- Does NOT execute code on remote servers

### MCP Servers
All MCP servers run locally via `npx`. They connect to your local development environment only. The `figma-devmode` server connects to Figma's API (requires your own OAuth login).

### Secrets
- No secrets are stored in this repository
- Optional tokens (Figma, GitHub) are configured via environment variables or Claude Code's secure `userConfig`
- The `SECURITY_HYGIENE_CHECKLIST.md` in `rules/security/` covers best practices for your projects

## Reporting Vulnerabilities

If you find a security issue in NeuraForge AI:

1. **Do NOT open a public issue**
2. Email: [create a private security advisory](https://github.com/vikisingh23/neuraforge-ai/security/advisories/new)
3. Include: description, steps to reproduce, potential impact

We will respond within 48 hours.

## Supported Versions

| Version | Supported |
|---------|-----------|
| Latest (main branch) | ✅ |
| Older commits | ❌ |
