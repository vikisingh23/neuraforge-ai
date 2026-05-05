---
name: code-review
description: Review code against enterprise standards — auto-detects stack (.NET, NestJS, React, RN, Flutter)
category: code-quality
triggers:
  - "review this code"
  - "check code quality"
  - "score this"
---

# enterprise Code Review

Review code against enterprise Rulebook standards. Auto-detects the stack.

## Instructions

1. Detect the stack from file extension and project structure
2. Load the appropriate reviewer:
   - `.cs` files → Read `agents/dotnet-reviewer.md`
   - `.ts` files with `@nestjs` → Read `agents/nestjs-reviewer.md`
   - `.tsx` files with React → Read `agents/react-reviewer.md`
   - `.tsx` files with React Native → Read `agents/rn-reviewer.md`
   - `.dart` files → Read `agents/flutter-reviewer.md`
3. Load shared rules: `core/NAMING_CONVENTIONS.md`, `security/SECURITY_GUIDELINES.md`
4. Score 0-100. Critical/Major/Minor/Suggestions format
5. Check architecture: thin controllers, no god classes, reuse existing, composition over inheritance
6. Check empathy: loading/error/empty states, financial formatting, a11y
7. Check testing: tests exist for all components/services
