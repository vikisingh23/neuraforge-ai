---
name: devops
description: Generate Dockerfiles, GitLab CI pipelines, K8s configs, and deployment setups
category: devops
triggers:
  - "use devops"
---

Generate Docker, CI/CD, and deployment configs.

## What it generates
- Dockerfile (multi-stage, non-root, healthcheck)
- docker-compose.yml (app + DB + Redis)
- .gitlab-ci.yml / GitHub Actions workflow
- Kubernetes manifests (deployment, service, ingress)
- .env.example with all required variables

For full instructions, read `agents/devops.md`.
