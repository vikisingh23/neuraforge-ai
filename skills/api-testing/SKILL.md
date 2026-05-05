---
name: api-testing
description: Generate and run Postman collections, validate API responses, manage test suites
category: general
triggers:
  - "use api-testing"
---

Generate and run API test collections.

## How to use
Point at an API or Swagger spec. The agent will:
1. Generate Postman/Newman collection
2. Test all endpoints (CRUD + error cases)
3. Validate response structure, status codes, auth flows
4. Report results with pass/fail summary

For full instructions, read `agents/api-testing.md`.
