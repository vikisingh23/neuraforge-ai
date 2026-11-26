# Security Rules

## Input Validation
- Validate ALL request DTOs (server-side, never trust client)
- Parameterized queries only — no string concatenation in SQL
- Whitelist validation where possible (enums, known values)

## Authentication & Authorization
- JWT with proper expiry, refresh flow, and revocation
- Role-based + claim-based authorization
- Rate limiting on public and auth endpoints

## Data Protection
- Encrypt sensitive fields at rest (PII, financial data)
- No PII in log messages — mask sensitive data
- No secrets in code, config, or error responses
- CORS configured per environment

## Common Vulnerabilities
- SQL injection: parameterized queries only
- XSS: sanitize all user input, escape output
- CSRF: anti-forgery tokens on state-changing endpoints
- Hardcoded secrets: use environment variables / secret managers

## OWASP Top 10:2025 Mapping
- **A01 Broken Access Control**: object-level authorization on every endpoint that takes an ID (BOLA/IDOR); enforce in the service/handler, not only the UI or a route attribute; bind to explicit DTOs (no mass assignment); never trust client-supplied role, tenant, price, amount or status
- **A02 Security Misconfiguration**: no debug or Swagger in production, no default credentials, least-privilege cloud and database roles, security headers
- **A03 Software Supply Chain Failures**: see "Supply chain" in `rules/core/DEPENDENCY_POLICY.md`
- **A04 Cryptographic Failures**: TLS 1.2+, no custom crypto, Argon2id/bcrypt for passwords, keys in a vault
- **A05 Injection**: parameterized queries for SQL, NoSQL and OS commands; encode output for its context
- **A06 Insecure Design**: threat-model money movement, identity and OTP flows; enforce business limits server-side
- **A07 Authentication Failures**: MFA for admin, lockout/throttling, short-lived JWT, rotate refresh tokens, no tokens in URLs
- **A08 Software or Data Integrity Failures**: verify webhook signatures, no unsafe deserialization, protect CI/CD
- **A09 Logging and Alerting Failures**: log auth events and access denials, alert on anomalies, never log secrets or PII
- **A10 Mishandling of Exceptional Conditions**: fail closed. Every error path denies access and rolls back state. No empty `catch`. Generic messages to clients, detail to logs

## SSRF and File Upload
- Server-side fetch of a user-supplied URL: host allow-list, block private/link-local/metadata ranges (including `169.254.169.254`), no unchecked redirects, timeouts and size limits
- Uploads: check type by content, limit size, store outside the web root, generate server-side names, scan

## AI, Agents and MCP
- **Prompt injection**: everything an agent reads (files, web pages, PR text, tool and MCP output) is untrusted data and must not trigger actions
- **Excessive agency**: minimum tools per agent. An agent that reads untrusted web content must not also have shell, write and secrets access in one session
- **Human approval** before irreversible actions (deploy, delete, payment, send, force-push, permission change)
- **No secrets in prompts, logs or agent configs.** Use `${ENV_VAR}` or a vault. Rotate any token that appears in a transcript
- **MCP servers**: pin versions, review tool descriptions for hidden instructions, use least-privilege and read-only tokens
- **Personal data**: do not send customer PII to external LLM services without an approved data-processing arrangement. Mask or synthesize it
- **Model output is untrusted input**: validate, encode and parameterize before it reaches a database, shell or browser

## Framework Security Advisories

- Track security advisories for the frameworks you run (React and Server Components, Next.js, ASP.NET Core, NestJS, Spring). Patch critical advisories within 24 hours, as the Dependency Policy requires.
- React Server Components had a critical unauthenticated remote code execution flaw in Dec 2025 (fixed in React 19.0.1, 19.1.2 and 19.2.1), followed by denial-of-service and source-exposure issues. Do not run lower versions. Treat every Server Function as a public endpoint: validate input, authenticate and authorize on every call.

