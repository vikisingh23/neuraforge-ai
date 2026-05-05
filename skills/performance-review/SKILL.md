---
name: performance-review
description: Review for N+1 queries, missing memoization, unbounded queries, re-renders, caching gaps
category: code-quality
triggers:
  - "check performance"
  - "find n+1"
  - "performance audit"
---

Review code for performance issues.

## What it checks
- N+1 database queries
- Missing indexes on frequently queried columns
- Unbounded queries (no pagination/LIMIT)
- Unnecessary re-renders (React/Flutter)
- Missing memoization, caching opportunities
- Large bundle imports

For full instructions, read `agents/performance-review.md`.
