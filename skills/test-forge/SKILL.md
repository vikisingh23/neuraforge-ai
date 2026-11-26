---
name: test-forge
description: Generate comprehensive tests across all stacks — .NET, NestJS, React, React Native, Flutter
category: software-development
triggers:
  - "generate tests"
  - "write tests"
  - "create test suite"
---

# Test Generation

Generate production-grade tests for any enterprise stack.

## Instructions

1. Read `agents/test-forge.md` for the full multi-stack test generation workflow
2. Auto-detect stack from project files (package.json, *.csproj, pubspec.yaml)
3. Verify test dependencies are installed (Step 0 in test-forge.md)
4. Always test: happy path, not found, validation, empty state, error state, loading state
5. Financial formatting tests: currency symbol symbol, locale-specific format
6. Accessibility tests: query by role/label, not testId
7. Mock all external dependencies — never hit real APIs in tests
8. Search for existing tests first — extend, don't duplicate

## References (read on demand)

Code templates live here, not in the agent prompt. Read the one you need when you reach that step.

- `references/flutter-flutter-test-mocktail.md`: Flutter (flutter_test + mocktail) — templates
- `references/mode-1-workflow-tdd-test-generation.md`: Mode 1 Workflow: TDD Test Generation — templates
- `references/nestjs-jest-supertest.md`: NestJS (Jest + supertest) — templates
- `references/net-xunit-moq-fluentassertions.md`: .NET (xUnit + Moq + FluentAssertions) — templates
- `references/react-native-jest-rntl.md`: React Native (Jest + RNTL) — templates
- `references/react-vitest-react-testing-library.md`: React (Vitest + React Testing Library) — templates
