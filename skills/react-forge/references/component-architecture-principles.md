# Component Architecture Principles (CRITICAL) — templates

Loaded on demand by the `react-forge` agent. Moved out of `agents/react-forge.md` so the agent prompt stays small.

## Template 1

NEVER** fetch data in a parent and pass it down as props through multiple layers. Instead, colocate data fetching with the component that uses it. React Query's cache ensures no duplicate requests.

```javascript
// ❌ WRONG — God component fetches everything and prop-drills
const DashboardPage = () => {
  const { data: portfolio } = usePortfolio();
  const { data: transactions } = useTransactions();
  const { data: holdings } = useHoldings();
  return (
    <div>
      <PortfolioSummary portfolio={portfolio} />
      <HoldingsTable holdings={holdings} />
      <TransactionList transactions={transactions} />
    </div>
  );
};

// ✅ CORRECT — Each component fetches its own data
const DashboardPage = () => (
  <div>
    <PortfolioSummary />
    <HoldingsTable />
    <RecentTransactions />
  </div>
);

// Each child owns its data:
const PortfolioSummary = () => {
  const { data, isLoading } = useSuspenseQuery(portfolioQueryOptions.summary());
  if (isLoading) return <PortfolioSummarySkeleton />;
  return <Card>...</Card>;
};
```

## Template 2

4. **Nothing similar exists** → Create a new focused component

```javascript
// Example: Found an existing TransactionCard that's 200 lines and handles
// display, editing, deletion, and status updates all in one component

// ❌ WRONG — Reuse the god component as-is
<TransactionCard transaction={txn} mode="view" editable={true}
  onEdit={handleEdit} onDelete={handleDelete} onStatusChange={handleStatus}
  showActions={true} compact={false} />

// ❌ ALSO WRONG — Create a brand new component from scratch ignoring the existing one

// ✅ CORRECT — Break the god component into focused pieces, then reuse
// Refactor TransactionCard into:
//   - TransactionSummary (display only, ~40 lines)
//   - TransactionActions (edit/delete buttons, ~30 lines)
//   - TransactionStatusBadge (status display, ~20 lines)
// Then compose what you need:
<Card>
  <TransactionSummary transaction={txn} />
  <TransactionStatusBadge status={txn.status} />
</Card>
```

## Template 3

A component should do ONE thing. If it's over 150 lines, it needs splitting.

```javascript
// ❌ WRONG — God component doing everything
const TransactionPage = () => {
  // 20 lines of state
  // 15 lines of API calls
  // 30 lines of handlers
  // 10 lines of validation
  // 100 lines of JSX with filters, table, pagination, modals
  // = 175+ lines, untestable, unreusable
};

// ✅ CORRECT — Composed from focused components
const TransactionPage = () => (
  <PageLayout title="Transactions">
    <TransactionFilters />
    <TransactionTable />
    <TransactionPagination />
  </PageLayout>
);
// Each sub-component: own data, own hooks, own tests, <80 lines
```

## Template 4

Prefer composing small components over building configurable mega-components.

```javascript
// ❌ WRONG — Mega-component with 15 props
<DataDisplay
  type="table"
  data={holdings}
  columns={columns}
  sortable={true}
  filterable={true}
  paginated={true}
  exportable={true}
  searchable={true}
  onRowClick={handleClick}
  emptyMessage="No holdings"
  loadingComponent={<Spinner />}
/>

// ✅ CORRECT — Composed from focused pieces
<Card>
  <CardHeader>
    <SearchInput onSearch={setSearch} />
    <ExportButton data={holdings} />
  </CardHeader>
  <HoldingsTable data={holdings} onRowClick={handleClick} />
  <Pagination {...paginationProps} />
</Card>
```
