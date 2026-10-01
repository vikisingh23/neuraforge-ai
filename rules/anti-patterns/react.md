# React Anti-Patterns

Confirmed mistakes from real usage. The `react-forge` and `react-reviewer` agents
load this file before generating or reviewing React code. Every rule here was reported
via feedback and confirmed by a maintainer.

---

## Anti-Patterns

### [AP-001] Never use useState + useEffect for API data
**Added:** 2026-09-30 | **Source:** seed rule
**Pattern to avoid:**
```tsx
const [orders, setOrders] = useState(null);
const [loading, setLoading] = useState(true);
useEffect(() => {
  fetch('/api/orders').then(r => r.json()).then(data => {
    setOrders(data);
    setLoading(false);
  });
}, []);
```
**Correct approach:**
```tsx
const { data: orders, isLoading } = useQuery({
  queryKey: ordersKeys.list(params),
  queryFn: () => ordersService.getAll(params),
  staleTime: 5 * 60 * 1000,
});
```
**Rule:** Always use React Query (`useQuery`/`useMutation`) for all API data. useState + useEffect for API calls is a hard violation.

---

### [AP-002] Never hardcode colors, spacing, or font sizes
**Added:** 2026-09-30 | **Source:** seed rule
**Pattern to avoid:**
```tsx
<div style={{ color: '#1976D2', padding: '16px', fontSize: '14px' }}>
```
**Correct approach:**
```tsx
<div className="order-card">   // uses CSS variables from DESIGN.md tokens
// or
<div style={{ color: 'var(--color-primary)', padding: 'var(--spacing-md)' }}>
```
**Rule:** Always use design tokens from DESIGN.md. Never hardcode visual values.

---

### [AP-003] Every data-driven component must handle all 4 UX states
**Added:** 2026-09-30 | **Source:** seed rule
**Pattern to avoid:**
```tsx
// Missing loading, error, empty states
return <div>{data.items.map(item => <Card key={item.id} {...item} />)}</div>;
```
**Correct approach:**
```tsx
if (isLoading) return <Skeleton />;          // loading
if (isError) return <ErrorRetry onRetry={refetch} />;  // error
if (!data?.items.length) return <EmptyState />;         // empty
return <div>{data.items.map(...)}</div>;                // data
```
**Rule:** All 4 states (loading, error, empty, data) are mandatory on every data-driven component.

---

### [AP-004] Never use array index as React key
**Added:** 2026-09-30 | **Source:** seed rule
**Pattern to avoid:**
```tsx
{items.map((item, index) => <Card key={index} />)}
```
**Correct approach:**
```tsx
{items.map((item) => <Card key={item.id} />)}
```
**Rule:** Always use stable, unique entity IDs as React keys.

---

<!-- New anti-patterns are added here via: npm run feedback:submit -->
