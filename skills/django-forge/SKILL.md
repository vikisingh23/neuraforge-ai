---
name: django-forge
description: Generate production-ready Django + DRF APIs following Controller → Repository → Serializer pattern with Celery
category: software-development
triggers:
  - "build django api"
  - "create django"
  - "generate python api"
---

Generate Django + DRF APIs following Controller → Repository → Serializer pattern.

## What it generates
Model (audit fields + history) + Repository (extends BaseRepository) +
Serializer (DRF validation) + Controller (@api_view + decorators) +
URLs + Celery tasks + Tests + Migration.

Uses: django-simple-history, django-filter, django-redis.

For full instructions, read `agents/django-forge.md`.

## References (read on demand)

Code templates live here, not in the agent prompt. Read the one you need when you reach that step.

- `references/additional-patterns-from-production-codebases.md`: Additional Patterns (from production codebases) — templates
- `references/code-patterns.md`: Code Patterns — templates
