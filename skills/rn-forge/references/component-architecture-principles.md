# Component Architecture Principles (CRITICAL) — templates

Loaded on demand by the `rn-forge` agent. Moved out of `agents/rn-forge.md` so the agent prompt stays small.

## Template 1

NEVER** fetch all data in a screen and pass it down as props. Each component fetches its own data. React Query's cache ensures no duplicate requests.

```typescript
// ❌ WRONG — Screen fetches everything, prop-drills down
const DashboardScreen = () => {
  const { data: portfolio } = usePortfolio();
  const { data: holdings } = useHoldings();
  const { data: transactions } = useTransactions();
  return (
    <ScrollView>
      <PortfolioSummary portfolio={portfolio} />
      <HoldingsCard holdings={holdings} />
      <RecentTransactions transactions={transactions} />
    </ScrollView>
  );
};

// ✅ CORRECT — Each component owns its data
const DashboardScreen = () => (
  <ScrollView>
    <PortfolioSummary />
    <HoldingsCard />
    <RecentTransactions />
  </ScrollView>
);

const PortfolioSummary = () => {
  const { data, isLoading } = useQuery(portfolioQueryOptions.summary());
  if (isLoading) return <PortfolioSummarySkeleton />;
  return <Card>...</Card>;
};
```

## Template 2

4. **Nothing similar exists** → Create a new focused component

```typescript
// Example: Found an existing TransactionCard that's 200 lines handling
// display, editing, deletion, and status updates all in one

// ❌ WRONG — Reuse the god component as-is
<TransactionCard transaction={txn} mode="view" editable onEdit={handleEdit}
  onDelete={handleDelete} onStatusChange={handleStatus} showActions compact={false} />

// ❌ ALSO WRONG — Create a brand new component ignoring the existing one

// ✅ CORRECT — Break the god component into focused pieces, then reuse
<View>
  <TransactionSummary transaction={txn} />
  <TransactionStatusBadge status={txn.status} />
</View>
```

## Template 3

A screen should compose components, not contain all logic. If it's over 150 lines, split it.

```typescript
// ❌ WRONG — God screen with everything inline
const TransactionScreen = () => {
  // 20 lines of state, 15 lines of queries, 30 lines of handlers
  // 100+ lines of JSX with filters, list, pagination, modals
};

// ✅ CORRECT — Screen composes focused components
const TransactionScreen = () => (
  <SafeAreaView style={styles.container}>
    <TransactionFilters />
    <TransactionList />
  </SafeAreaView>
);
// Each sub-component: own data, own hooks, own tests, <80 lines
```
