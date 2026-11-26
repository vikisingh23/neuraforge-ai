# Component Architecture Principles (CRITICAL) — templates

Loaded on demand by the `flutter-forge` agent. Moved out of `agents/flutter-forge.md` so the agent prompt stays small.

## Template 1

Each widget watches its own provider. Parent screens compose widgets, not fetch data.

```dart
// ❌ WRONG — Screen fetches everything, passes down
class DashboardScreen extends ConsumerWidget {
  Widget build(context, ref) {
    final portfolio = ref.watch(portfolioProvider);
    final holdings = ref.watch(holdingsProvider);
    final transactions = ref.watch(transactionsProvider);
    return Column(children: [
      PortfolioSummary(data: portfolio),  // prop drilling
      HoldingsCard(data: holdings),
      RecentTransactions(data: transactions),
    ]);
  }
}

// ✅ CORRECT — Each widget owns its data
class DashboardScreen extends StatelessWidget {
  Widget build(context) => const Column(children: [
    PortfolioSummary(),    // watches its own provider
    HoldingsCard(),        // watches its own provider
    RecentTransactions(),  // watches its own provider
  ]);
}
```

## Template 2

- **Repositories**: Max 200 lines. One repo = one API domain

```dart
// ❌ WRONG — God widget
class TransactionScreen extends ConsumerWidget {
  // 300 lines: filters, list, pagination, modals, form, validation all inline
}

// ✅ CORRECT — Composed
class TransactionScreen extends StatelessWidget {
  Widget build(context) => Scaffold(
    appBar: AppBar(title: const Text('Transactions')),
    body: const Column(children: [
      TransactionFilters(),
      Expanded(child: TransactionList()),
    ]),
  );
}
```
