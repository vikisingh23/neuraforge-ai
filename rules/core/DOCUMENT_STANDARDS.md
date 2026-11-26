# Document Generation Standards

When a pipeline stage produces a deliverable document (BRS, Architecture Plan, Review Report), generate BOTH:
1. **Markdown file** (for agent consumption — handoff YAML + content)
2. **Word document** (for human consumption — formatted, branded)

## When to Generate Word Documents

| Stage | Document | Filename |
|-------|----------|----------|
| 1 | Business Requirements Specification | `docs/BRS-{feature}.docx` |
| 5 | Architecture Design Document | `docs/ARCH-{feature}.docx` |
| 7-8 | Code Review Report | `docs/REVIEW-{feature}.docx` |
| 9 | Release Summary (handoff) | `docs/RELEASE-{feature}.docx` |

Documents are saved to `.kiro/workspace/{feature}/docs/`

## BRS Document Format

Use `create_document` MCP tool with this structure:

```json
{
  "filePath": ".kiro/workspace/{feature}/docs/BRS-{feature}.docx",
  "title": "Business Requirements Specification",
  "author": "NeuraForge AI — Product Manager",
  "sections": [
    {
      "header": "Your Company — Confidential",
      "footer": "BRS v1.0 | {date} | Page {page}",
      "content": [
        {"heading": 1, "text": "Business Requirements Specification"},
        {"heading": 2, "text": "{Feature Name}"},
        {"text": "Document Version: 1.0", "size": 10, "color": "#666666"},
        {"text": "Date: {date}", "size": 10, "color": "#666666"},
        {"text": "Author: Product Manager (AI-Assisted)", "size": 10, "color": "#666666"},
        {"text": "Status: {Approved/Draft}", "size": 10, "color": "#666666"},
        "---",
        {"heading": 2, "text": "1. Executive Summary"},
        {"text": "{2-3 line summary of the feature}"},
        {"heading": 2, "text": "2. Regulatory Framework"},
        {"text": "{SEBI regulations, circulars, compliance requirements}"},
        {"heading": 2, "text": "3. Functional Requirements"},
        {"table": {"rows": [["ID", "Requirement", "Priority", "Source"]], "headerRow": true}},
        {"heading": 2, "text": "4. Acceptance Criteria"},
        {"table": {"rows": [["AC#", "Criteria", "Test Approach"]], "headerRow": true}},
        {"heading": 2, "text": "5. Data Requirements"},
        {"table": {"rows": [["Entity", "Field", "Type", "Constraints"]], "headerRow": true}},
        {"heading": 2, "text": "6. API Specifications"},
        {"table": {"rows": [["Method", "Endpoint", "Request", "Response"]], "headerRow": true}},
        {"heading": 2, "text": "7. Edge Cases & Risks"},
        {"table": {"rows": [["ID", "Scenario", "Severity", "Mitigation"]], "headerRow": true}},
        {"heading": 2, "text": "8. Dependencies"},
        {"text": "{External systems, teams, approvals needed}"},
        {"heading": 2, "text": "9. Sign-Off"},
        {"table": {"rows": [["Role", "Name", "Date", "Signature"], ["Product Owner", "", "", ""], ["Tech Lead", "", "", ""], ["Compliance", "", "", ""]], "headerRow": true}}
      ]
    }
  ]
}
```

## Architecture Document Format

```json
{
  "filePath": ".kiro/workspace/{feature}/docs/ARCH-{feature}.docx",
  "title": "Architecture Design Document",
  "author": "NeuraForge AI — Architecture Reviewer",
  "sections": [
    {
      "header": "Your Company — Confidential",
      "footer": "Architecture v1.0 | {date}",
      "content": [
        {"heading": 1, "text": "Architecture Design Document"},
        {"heading": 2, "text": "{Feature Name}"},
        {"text": "Selected Plan: {Plan A/B}", "bold": true},
        "---",
        {"heading": 2, "text": "1. System Context"},
        {"text": "{High-level system diagram description}"},
        {"heading": 2, "text": "2. Proposed Architecture"},
        {"text": "{Detailed architecture of selected plan}"},
        {"heading": 2, "text": "3. Component Design"},
        {"table": {"rows": [["Component", "Responsibility", "Changes"]], "headerRow": true}},
        {"heading": 2, "text": "4. Data Model Changes"},
        {"table": {"rows": [["Entity", "Field", "Type", "Action"]], "headerRow": true}},
        {"heading": 2, "text": "5. API Design"},
        {"table": {"rows": [["Method", "Path", "Description"]], "headerRow": true}},
        {"heading": 2, "text": "6. Sequence Diagram"},
        {"text": "{Step-by-step flow}"},
        {"heading": 2, "text": "7. Decisions & Trade-offs"},
        {"table": {"rows": [["Decision", "Choice", "Rationale"]], "headerRow": true}},
        {"heading": 2, "text": "8. Risks & Mitigations"},
        {"table": {"rows": [["Risk", "Severity", "Mitigation"]], "headerRow": true}},
        {"heading": 2, "text": "9. Approval"},
        {"text": "Approved by: ________________  Date: ________"}
      ]
    }
  ]
}
```

## Review Report Format

```json
{
  "filePath": ".kiro/workspace/{feature}/docs/REVIEW-{feature}.docx",
  "title": "Code Review Report",
  "sections": [
    {
      "content": [
        {"heading": 1, "text": "Code Review Report — {Feature}"},
        {"text": "Score: {N}/100 | Verdict: {PASS/FAIL}", "bold": true, "size": 14},
        {"heading": 2, "text": "Summary"},
        {"text": "{1-2 line summary}"},
        {"heading": 2, "text": "Findings"},
        {"table": {"rows": [["#", "Severity", "File", "Issue", "Recommendation"]], "headerRow": true}},
        {"heading": 2, "text": "Critical Items Coverage"},
        {"table": {"rows": [["ID", "Item", "Status", "Proof"]], "headerRow": true}}
      ]
    }
  ]
}
```
