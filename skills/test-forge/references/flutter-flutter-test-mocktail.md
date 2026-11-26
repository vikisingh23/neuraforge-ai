# Flutter (flutter_test + mocktail) — templates

Loaded on demand by the `test-forge` agent. Moved out of `agents/test-forge.md` so the agent prompt stays small.

## Template 1

```dart
void main() {
  late MockTransactionRepository mockRepo;

  setUp(() {
    mockRepo = MockTransactionRepository();
  });

  testWidgets('shows shimmer loading', (tester) async {
    when(() => mockRepo.getTransactions(investorId: any(named: 'investorId')))
        .thenAnswer((_) => Future.delayed(const Duration(seconds: 10)));
    await tester.pumpWidget(createTestApp(mockRepo));
    expect(find.byType(ShimmerLoading), findsOneWidget);
  });

  testWidgets('renders data', (tester) async {
    when(() => mockRepo.getTransactions(investorId: any(named: 'investorId')))
        .thenAnswer((_) async => [testTransaction]);
    await tester.pumpWidget(createTestApp(mockRepo));
    await tester.pumpAndSettle();
    expect(find.text('Example Flexi Cap'), findsOneWidget);
  });

  testWidgets('shows empty state with CTA', (tester) async {
    when(() => mockRepo.getTransactions(investorId: any(named: 'investorId')))
        .thenAnswer((_) async => []);
    await tester.pumpWidget(createTestApp(mockRepo));
    await tester.pumpAndSettle();
    expect(find.text('No transactions yet'), findsOneWidget);
    expect(find.text('Start your first SIP →'), findsOneWidget);
  });

  testWidgets('shows error with retry', (tester) async {
    when(() => mockRepo.getTransactions(investorId: any(named: 'investorId')))
        .thenThrow(Exception('Network error'));
    await tester.pumpWidget(createTestApp(mockRepo));
    await tester.pumpAndSettle();
    expect(find.text('Unable to load transactions'), findsOneWidget);
    await tester.tap(find.text('Retry'));
  });

  testWidgets('formats amounts correctly', (tester) async {
    when(() => mockRepo.getTransactions(investorId: any(named: 'investorId')))
        .thenAnswer((_) async => [Transaction(amount: 123456.78)]);
    await tester.pumpWidget(createTestApp(mockRepo));
    await tester.pumpAndSettle();
    expect(find.text('₹1,23,456.78'), findsOneWidget);
  });
}
```
