# 🎯 Screen Generation Workflow (MANDATORY) — templates

Loaded on demand by the `flutter-forge` agent. Moved out of `agents/flutter-forge.md` so the agent prompt stays small.

## Template 1

```dart
// models/[entity].dart — Freezed data class
@freezed
class Transaction with _$Transaction {
  const factory Transaction({
    required String id,
    required String schemeName,
    required double amount,
    required DateTime date,
    required TransactionStatus status,
  }) = _Transaction;

  factory Transaction.fromJson(Map<String, dynamic> json) =>
      _$TransactionFromJson(json);
}

// repositories/[entity]_repository.dart
abstract class TransactionRepository {
  Future<List<Transaction>> getTransactions({required String investorId});
  Future<Transaction> getById({required String id});
  Future<void> create(CreateTransactionRequest request);
}

class TransactionRepositoryImpl implements TransactionRepository {
  final ApiClient _client;
  TransactionRepositoryImpl(this._client);

  @override
  Future<List<Transaction>> getTransactions({required String investorId}) async {
    final response = await _client.get('/api/transactions', queryParams: {'investorId': investorId});
    return (response.data as List).map((e) => Transaction.fromJson(e)).toList();
  }
}
```

## Template 2

```dart
// providers/[entity]_provider.dart
final transactionRepositoryProvider = Provider<TransactionRepository>((ref) {
  return TransactionRepositoryImpl(ref.read(apiClientProvider));
});

final transactionsProvider = FutureProvider.autoDispose
    .family<List<Transaction>, String>((ref, investorId) {
  return ref.read(transactionRepositoryProvider).getTransactions(investorId: investorId);
});

// For mutations:
final createTransactionProvider = AsyncNotifierProvider.autoDispose<
    CreateTransactionNotifier, void>(CreateTransactionNotifier.new);

class CreateTransactionNotifier extends AutoDisposeAsyncNotifier<void> {
  @override
  FutureOr<void> build() {}

  Future<void> create(CreateTransactionRequest request) async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() =>
        ref.read(transactionRepositoryProvider).create(request));
    // Invalidate list cache after mutation
    ref.invalidate(transactionsProvider);
  }
}
```

## Template 3

```dart
// screens/[entity]_screen.dart — Thin screen, delegates to widgets
class TransactionListScreen extends ConsumerWidget {
  const TransactionListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(title: const Text('Transactions')),
      body: const TransactionListBody(),
    );
  }
}

// widgets/[entity]/transaction_list_body.dart — Owns its data
class TransactionListBody extends ConsumerWidget {
  const TransactionListBody({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final transactions = ref.watch(transactionsProvider(investorId));
    return transactions.when(
      loading: () => const TransactionListSkeleton(),
      error: (error, stack) => ErrorRetryWidget(
        message: 'Unable to load transactions',
        onRetry: () => ref.invalidate(transactionsProvider),
      ),
      data: (items) => items.isEmpty
          ? const EmptyStateWidget(
              icon: Icons.receipt_long,
              title: 'No transactions yet',
              subtitle: 'Start your first SIP →',
            )
          : ListView.builder(
              itemCount: items.length,
              itemBuilder: (context, index) => TransactionTile(transaction: items[index]),
            ),
    );
  }
}
```

## Template 4

```dart
// test/screens/transaction_list_screen_test.dart
void main() {
  late MockTransactionRepository mockRepo;

  setUp(() {
    mockRepo = MockTransactionRepository();
  });

  testWidgets('shows loading state', (tester) async {
    when(() => mockRepo.getTransactions(investorId: any(named: 'investorId')))
        .thenAnswer((_) => Future.delayed(const Duration(seconds: 10)));
    await tester.pumpWidget(createTestApp(mockRepo));
    expect(find.byType(TransactionListSkeleton), findsOneWidget);
  });

  testWidgets('shows data after fetch', (tester) async {
    when(() => mockRepo.getTransactions(investorId: any(named: 'investorId')))
        .thenAnswer((_) async => [testTransaction]);
    await tester.pumpWidget(createTestApp(mockRepo));
    await tester.pumpAndSettle();
    expect(find.text('Test Scheme'), findsOneWidget);
  });

  testWidgets('shows empty state', (tester) async {
    when(() => mockRepo.getTransactions(investorId: any(named: 'investorId')))
        .thenAnswer((_) async => []);
    await tester.pumpWidget(createTestApp(mockRepo));
    await tester.pumpAndSettle();
    expect(find.text('No transactions yet'), findsOneWidget);
  });

  testWidgets('shows error with retry', (tester) async {
    when(() => mockRepo.getTransactions(investorId: any(named: 'investorId')))
        .thenThrow(Exception('Network error'));
    await tester.pumpWidget(createTestApp(mockRepo));
    await tester.pumpAndSettle();
    expect(find.text('Unable to load transactions'), findsOneWidget);
    expect(find.byType(ElevatedButton), findsOneWidget); // Retry button
  });
}
```
