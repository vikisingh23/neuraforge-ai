## What does this PR do?

<!-- One sentence summary -->

## Type of change

- [ ] New agent / skill
- [ ] Improvement to existing agent
- [ ] New MCP server
- [ ] Bug fix
- [ ] Documentation
- [ ] Infrastructure / CI

## Agent(s) changed

<!-- List the agent .md files modified or created -->

- `agents/`
- `skills/`

## Testing

<!-- Describe how you tested this. Which platform, which model, what prompt, what output? -->

**Platform:** Claude Code / Cursor / Gemini / Other
**Model:** Claude Sonnet / GPT-4o / Gemini Pro / Other
**Test prompt:**
```
<!-- Paste the prompt you used to test -->
```

**Output (snippet):**
```
<!-- Paste the relevant generated output to show it works -->
```

## Checklist

- [ ] No company-specific content (keep it generic and reusable)
- [ ] No hardcoded secrets or tokens
- [ ] Agent follows the template structure (`agents/_TEMPLATE.md`)
- [ ] Corresponding skill added/updated in `skills/`
- [ ] Agent listed in `AGENTS.md` (if new)
- [ ] `README.md` updated if counts changed (agents/skills/MCP servers)
- [ ] Tested on at least one platform
- [ ] MCP servers pinned to exact version (no `@latest`) if added
