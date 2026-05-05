---
name: scaffold
description: Bootstrap a new project with your stack, auth, database, and standards pre-configured
category: developer-tools
triggers:
  - "bootstrap project"
  - "create new project"
  - "scaffold"
---

Bootstrap a new project with enterprise standards pre-configured.

## How to use
Say what you need: "New NestJS project with Postgres, JWT auth, and Swagger"

Generates: base entity (audit fields, soft delete), auth module, health check,
Docker + docker-compose, .env.example, CI/CD config, README, and test setup.

Stacks: .NET Core, NestJS, Django, Spring Boot, React (Vite), Flutter.

For full instructions, read `agents/scaffold.md`.
