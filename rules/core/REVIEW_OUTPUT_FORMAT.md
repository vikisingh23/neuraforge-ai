# Review Output Format

All code review agents MUST end their output with this structured block.

## Required Output

```
## Review Summary

| Metric | Value |
|--------|-------|
| Score | 0-100 |
| Verdict | PASS (≥70) / FAIL (<70) |
| Files Reviewed | N |
| Critical Issues | N |

### Blockers (must fix before merge)
- [ ] Issue description — file:line

### Warnings (should fix)
- [ ] Issue description — file:line

### Suggestions (nice to have)
- [ ] Issue description — file:line
```

## Scoring Guide

| Range | Meaning |
|-------|---------|
| 90-100 | Production-ready, exemplary code |
| 70-89 | Merge-ready with minor suggestions |
| 50-69 | Needs fixes before merge |
| 30-49 | Significant rework required |
| 0-29 | Fundamental design issues |

## Rules
- A single **Blocker** caps the score at 69 (auto-FAIL)
- Security vulnerabilities are always Blockers
- Missing tests for new logic is a Blocker
- Style-only issues are Suggestions, never Blockers
