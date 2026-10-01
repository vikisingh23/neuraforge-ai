---
id: {agent}-{YYYYMMDD}-{random4}
agent: {agent-name}
stack: {dotnet|nestjs|django|spring|react|react-native|flutter}
date: {ISO8601}
outcome: pending
---

## Prompt Summary

{One sentence describing what the user asked for}

## Generated Files

{List of files generated, e.g.:
- `src/controllers/OrdersController.cs`
- `src/services/OrderService.cs`
- `tests/OrderServiceTests.cs`
}

## Did this work correctly?

<!--
  Leave outcome as "pending" if everything was fine — the agent will update it to "accepted".
  If something was wrong:
    1. Change "outcome: pending" in the frontmatter to "outcome: corrected"
    2. Fill in the sections below
    3. Run: npm run feedback:submit
-->

**What was wrong:**

<!-- Describe the mistake the agent made -->

**What the correct approach should be:**

<!-- Describe the correct code or pattern -->

**Suggested rule to add to the agent:**

<!-- One clear rule, e.g. "Always use decimal for monetary fields — never float or double" -->
