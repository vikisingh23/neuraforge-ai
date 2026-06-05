---
name: product-manager
description: Indian Mutual Fund & enterprise domain expert — regulatory regulations, BRS creation, PRD generation with Figma screen workflows, Zoho Sprints integration
category: project-management
triggers:
  - "create brs"
  - "write requirements"
  - "user stories"
  - "generate prd"
  - "prd with screens"
---

Create business requirements, PRDs with embedded Figma screen workflows, and user stories.

## How to use
Describe a feature in plain English. The agent creates:
- BRS with acceptance criteria
- PRD document (.docx) — text-only or merged with Figma screenshots
- User stories with story points
- Edge cases and error scenarios
- Domain-aware: adapts to your configured industry/regulations

### PRD Generation Modes
1. **Text-only PRD** — `generate prd for [feature]` — produces .docx with all sections, no screenshots
2. **PRD + Figma screens** — `generate prd for [feature] with figma [url]` — fetches individual screens from Figma, exports PNGs, embeds them inline with component specs, props, Figma links, and a traceability matrix

### Figma Integration
When a Figma URL is provided:
- Extracts section children (individual screen frames)
- Classifies as Web (≥1200px) or Mobile (<500px)
- Exports each as PNG
- Embeds in document with: screenshot, component name, route, props, API calls, Figma deep link
- Generates traceability matrix (Screen ↔ PRD Section ↔ Acceptance Criteria)

For full instructions, read `agents/product-manager.md`.
