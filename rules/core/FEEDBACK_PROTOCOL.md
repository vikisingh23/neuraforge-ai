# Feedback Protocol

Every agent that generates code MUST follow this protocol.
It is how NeuraForge learns from mistakes and improves over time.

---

## Step 1: Load Anti-Patterns Before Generating

Before generating ANY code, load your stack's anti-pattern file:

```
rules/anti-patterns/{stack}.md
```

- React → `rules/anti-patterns/react.md`
- .NET → `rules/anti-patterns/dotnet.md`
- NestJS → `rules/anti-patterns/nestjs.md`
- Django → `rules/anti-patterns/django.md`
- Spring Boot → `rules/anti-patterns/spring.md`
- React Native → `rules/anti-patterns/react-native.md`
- Flutter → `rules/anti-patterns/flutter.md`

Read every entry. Apply every rule. These are confirmed mistakes from real usage.

Also check for project-specific lessons:

```
.neuraforge/lessons.md   ← if it exists, read it and apply those rules too
```

---

## Step 2: Write a Feedback Log After Generating

After completing code generation, create a feedback log at:

```
.neuraforge/feedback/{agent}-{YYYYMMDD}-{4-char-random}.md
```

Use this exact schema (copy from `.neuraforge/feedback/TEMPLATE.md`):

```markdown
---
id: react-forge-20260930-a3f2
agent: react-forge
stack: react
date: 2026-09-30T14:30:52Z
outcome: pending
---

## Prompt Summary

[One sentence summary of what was asked]

## Generated Files

- [list each file generated]

## Did this work correctly?

**What was wrong:**

**What the correct approach should be:**

**Suggested rule to add to the agent:**
```

Generate a random 4-character alphanumeric ID (e.g. `a3f2`, `b9k1`) for uniqueness.

---

## Step 3: Tell the User About the Log

At the end of your response, always add:

```
---
📋 Feedback log written to `.neuraforge/feedback/{filename}`.
If anything was wrong: open the file, set `outcome: corrected`, fill in what was wrong, then run `npm run feedback:submit`.
```

---

## Step 4: If the User Corrects You In-Session

If the user says "that's wrong" or provides a correction during the session:

1. Apply the correction immediately
2. Update the feedback log: change `outcome: pending` → `outcome: corrected`
3. Fill in "What was wrong" and "Suggested rule" in the log
4. Tell the user: "I've updated the feedback log — this will be submitted as a rule improvement."

---

## Why This Matters

Every `corrected` feedback file that gets submitted becomes a candidate for a new anti-pattern rule.
Once merged into `rules/anti-patterns/{stack}.md`, NO agent will make that mistake again — for any user, on any platform.

This is how the agents get smarter without changing the underlying AI model.
