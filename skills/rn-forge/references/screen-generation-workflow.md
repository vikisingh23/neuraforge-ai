# 🎯 Screen Generation Workflow (MANDATORY) — templates

Loaded on demand by the `rn-forge` agent. Moved out of `agents/rn-forge.md` so the agent prompt stays small.

## Template 1

Ask the user

```javascript
// ALWAYS load MF design tokens before generating any screen
// Use rulebook-skills MCP: get_design_tokens

const tokens = get_design_tokens({});
const colors = get_design_tokens({ category: 'colors' });
const components = get_design_tokens({ category: 'components' });

// KEY RULES for React Native:
// 1. Map CSS variables to RN StyleSheet using token values directly
// 2. colors.brand.primary = '#2E2A94' for all primary elements
// 3. Mobile layout: width 372, sidePadding 16, headerHeight 56, bottomNavHeight 56
// 4. Font family: Inter (primary), Butler (display only)
// 5. Use exact component specs: button heights (32/40/44), input height 40, radius 8
// 6. Status colors: success=#008743, error=#DC111E, warning=#FB8C00, pending=#F9A212
```

## Template 2

Ask the user

```typescript
// queries/[entity]Queries.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export const userKeys = {
  all: ['users'] as const,
  detail: (userId: string) => [...userKeys.all, 'detail', userId] as const,
};

export const useUserProfile = (userId: string) =>
  useQuery({
    queryKey: userKeys.detail(userId),
    queryFn: () => userService.getProfile(userId),
    staleTime: 5 * 60 * 1000,
    enabled: !!userId,
  });
```

## Template 3

Generate the screen following RN patterns (see Generation Patterns below).

```javascript
use_subagent({
  agent_name: "ui-validator",
  query: `Validate ${screenName} screen against Figma design`,
  relevant_context: JSON.stringify({
    componentPath: "src/screens/UserProfileScreen.tsx",
    figmaUrl,
    platform: "mobile"
  })
});
// Iterate until 85%+ match or max 5 iterations
```

## Template 4

Generate the screen following RN patterns (see Generation Patterns below).

```javascript
use_subagent({
  subagents: [
    {
      agent_name: "react-reviewer",
      query: "Review generated React Native screen for enterprise standards",
      relevant_context: "<screen + hooks + service code>"
    },
    {
      agent_name: "performance-reviewer",
      query: "Performance review of React Native screen (list perf, re-renders, images)",
      relevant_context: "<screen code>"
    }
  ]
});
```

## Template 5

- Score < 70: STOP, report to user

```typescript
// __tests__/UserProfileScreen.test.tsx
import { render, screen, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NavigationContainer } from '@react-navigation/native';

const wrapper = ({ children }) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={client}>
      <NavigationContainer>{children}</NavigationContainer>
    </QueryClientProvider>
  );
};

describe('UserProfileScreen', () => {
  it('renders loading state', () => { /* ... */ });
  it('renders data after fetch', async () => { /* ... */ });
  it('renders error state on failure', async () => { /* ... */ });
});
```
