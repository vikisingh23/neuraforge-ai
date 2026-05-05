---
name: security-review
description: Review code for security vulnerabilities — SQL injection, XSS, hardcoded secrets, weak crypto, PII exposure
category: code-quality
triggers:
  - "check security"
  - "find vulnerabilities"
  - "security audit"
---

Scan code for security vulnerabilities.

## What it checks
- SQL injection (string concatenation in queries)
- XSS (unsanitized user input in output)
- Hardcoded secrets (API keys, passwords, tokens in code)
- PII exposure (sensitive data in logs or error responses)
- Weak crypto, missing auth, CSRF, rate limiting gaps

For full instructions, read `agents/security-review.md`.
