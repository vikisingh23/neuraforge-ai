# 🎯 Screen Generation Workflow (MANDATORY) — templates

Loaded on demand by the `react-forge` agent. Moved out of `agents/react-forge.md` so the agent prompt stays small.

## Template 1

Ask the user

```javascript
// Delegate to Sentinel agent
use_subagent({
  agent_name: "sentinel",
  query: `Get API details for ${endpoint}`,
  relevant_context: `Need request/response structure for ${method} ${endpoint}`
});

// Sentinel will return:
// - Request body schema
// - Response body schema
// - Status codes
// - Headers
```

## Template 2

Ask the user

```javascript
// 1. Identify correct Axios instance
const axiosInstance = identifyAxiosInstance(endpoint);
// Rules:
// - /api/mf/ → mfService (from services/MF/)
// - /api/datalake/ → datalakeService (from services/Datalake/)
// - /api/user/ → userService (from services/)

// 2. Create API service file
// services/[domain]/[entity]Service.js
export const userService = {
  getProfile: (userId) => axiosInstance.get(`/api/users/${userId}`),
  updateProfile: (userId, data) => axiosInstance.put(`/api/users/${userId}`, data),
};
```

## Template 3

Ask the user

```javascript
// queries/[entity]QueryOptions.js
export const userKeys = {
  all: ['users'],
  detail: (userId) => [...userKeys.all, 'detail', userId],
};

export const userQueryOptions = {
  detail: (userId) =>
    queryOptions({
      queryKey: userKeys.detail(userId),
      queryFn: () => userService.getProfile(userId),
      staleTime: 5 * 60 * 1000,
    }),
};
```

## Template 4

Ask the user

```javascript
// Use @figma/get_file
const figmaDesign = await getFigmaFile({
  fileKey: extractFileKey(figmaUrl),
  nodeId: extractNodeId(figmaUrl)
});

// Extract design details:
// - Layout structure
// - Component hierarchy
// - Spacing, colors, typography
// - Interactive elements
```

## Template 5

Ask the user

```javascript
// ALWAYS load MF design tokens before generating any component
// Use rulebook-skills MCP: get_design_tokens

// Get all tokens:
const tokens = get_design_tokens({});

// Get specific category:
const colors = get_design_tokens({ category: 'colors.brand' });
const buttonSpecs = get_design_tokens({ category: 'components.button' });
const typography = get_design_tokens({ category: 'typography.scale' });

// Get CSS variables for stylesheet:
const cssVars = get_design_tokens({ format: 'css' });

// KEY RULES:
// 1. NEVER hardcode colors — use CSS variables: var(--color-brand-primary)
// 2. NEVER hardcode spacing — use spacing scale: var(--space-6)
// 3. NEVER hardcode radius — use radius tokens: var(--radius-sm)
// 4. Font family is ALWAYS Inter (primary) or Butler (display headings only)
// 5. Use the exact component specs for buttons, inputs, cards, tabs, modals
// 6. Desktop content max-width: 1232px, side padding: 104px
// 7. Mobile side padding: 16px, content width: 340px
```

## Template 6

Ask the user

```javascript
// Map Figma components to React components:
// - Frame → div with className
// - Text → Typography component
// - Button → CustomButton component
// - Input → FormField component
// - Card → Card component

// Generate component matching Figma design
export const UserProfile = ({ userId }) => {
  const { data: userProfile, isLoading, error } = useUserProfile(userId);
  
  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;
  
  return (
    <div className="user-profile" style={{ padding: '24px' }}>
      <Card>
        <Typography variant="h2">{userProfile.name}</Typography>
        <Typography variant="body">{userProfile.email}</Typography>
      </Card>
    </div>
  );
};
```

## Template 7

Ask the user

```javascript
// Spawn UI Validator agent
use_subagent({
  agent_name: "ui-validator",
  query: `Validate UserProfile component against Figma design`,
  relevant_context: JSON.stringify({
    componentPath: "src/components/UserProfile.jsx",
    figmaUrl: figmaUrl,
    localUrl: "http://localhost:3000/user-profile",
    componentName: "UserProfile"
  })
});

// UI Validator will:
// 1. Take screenshot of generated UI
// 2. Compare with Figma using Percy
// 3. Return similarity score and issues
```

## Template 8

Ask the user

```javascript
// If similarity < 85%:
// 1. Receive feedback from UI Validator
// 2. Apply fixes to component
// 3. Re-delegate to UI Validator
// 4. Repeat until 85%+ match or max 5 iterations

// Example feedback:
{
  "similarity": 78,
  "issues": [
    { "type": "spacing", "fix": "Increase padding to 24px" },
    { "type": "typography", "fix": "Change font-size to 16px" }
  ]
}

// Apply fixes and regenerate component
```

## Template 9

After UI validation passes, run a parallel code review before reporting

```javascript
use_subagent({
  subagents: [
    {
      agent_name: "react-reviewer",
      query: "Review generated React component for enterprise standards",
      relevant_context: "<component + hooks + service code>"
    },
    {
      agent_name: "performance-reviewer",
      query: "Performance review of generated React component",
      relevant_context: "<component code>"
    }
  ]
})
```

## Template 10

After code review passes, generate a test file for the component using Vitest + React Testing Library

```javascript
// __tests__/UserProfile.test.jsx
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi } from 'vitest';
import UserProfile from '../UserProfile';

// Mock the service
vi.mock('../../services/userService', () => ({
  userService: {
    getProfile: vi.fn().mockResolvedValue({
      success: true,
      data: { id: 1, name: 'Test User', email: 'test@example.com' }
    })
  }
}));

const wrapper = ({ children }) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

describe('UserProfile', () => {
  it('renders loading state', () => {
    render(<UserProfile userId={1} />, { wrapper });
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('renders data after fetch', async () => {
    render(<UserProfile userId={1} />, { wrapper });
    await waitFor(() => expect(screen.getByText('Test User')).toBeInTheDocument());
  });

  it('renders error state on failure', async () => {
    // Override mock for this test
    const { userService } = await import('../../services/userService');
    userService.getProfile.mockRejectedValueOnce(new Error('Network error'));
    render(<UserProfile userId={1} />, { wrapper });
    await waitFor(() => expect(screen.getByText(/error/i)).toBeInTheDocument());
  });
});
```
