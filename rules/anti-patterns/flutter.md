# Flutter Anti-Patterns

Confirmed mistakes from real usage. The `flutter-forge` / `flutter-reviewer` agents
load this file before generating or reviewing Flutter code.

---

## Anti-Patterns

### [AP-001] Never call setState after dispose
**Added:** 2026-09-30 | **Source:** seed rule
**Pattern to avoid:**
```dart
void _loadData() async {
  final data = await apiService.getOrders();
  setState(() { _orders = data; });  // crashes if widget disposed during await
}
```
**Correct approach:**
```dart
// Use Riverpod — handles lifecycle automatically
final ordersAsync = ref.watch(ordersProvider);

// Or if StatefulWidget is required:
void _loadData() async {
  final data = await apiService.getOrders();
  if (mounted) setState(() { _orders = data; });  // check mounted first
}
```
**Rule:** Always check `if (mounted)` before `setState` after any `await`. Prefer Riverpod which handles this automatically.

---

### [AP-002] Never put unbounded widgets in Column without Expanded
**Added:** 2026-09-30 | **Source:** seed rule
**Pattern to avoid:**
```dart
Column(
  children: [
    ListView(children: [...]),  // RenderFlex overflow — ListView needs bounded height
  ],
)
```
**Correct approach:**
```dart
Column(
  children: [
    Expanded(
      child: ListView(children: [...]),  // Expanded gives ListView a bounded height
    ),
  ],
)
```
**Rule:** Always wrap `ListView`/`GridView` inside `Expanded` or `SizedBox` when used in `Column` or `Row`.

---

### [AP-003] Use Freezed for data classes — never implement manually
**Added:** 2026-09-30 | **Source:** seed rule
**Pattern to avoid:**
```dart
class Order {
  final int orderId;
  final String status;
  Order({required this.orderId, required this.status});
  Order copyWith({int? orderId, String? status}) => Order(
    orderId: orderId ?? this.orderId,
    status: status ?? this.status,
  );
  // ... equals, hashCode, toString ...
}
```
**Correct approach:**
```dart
@freezed
class Order with _$Order {
  const factory Order({
    required int orderId,
    required String status,
  }) = _Order;

  factory Order.fromJson(Map<String, dynamic> json) => _$OrderFromJson(json);
}
```
**Rule:** All data models must use Freezed. Never hand-write `copyWith`, `==`, `hashCode`, or `toString`.

---

### [AP-004] Never use BuildContext after an await without checking mounted
**Added:** 2026-10-03 | **Source:** seed rule
**Pattern to avoid:**
```dart
onPressed: () async {
  await orderRepository.cancel(orderId);
  Navigator.of(context).pop();  // context may belong to a disposed widget
}
```
**Correct approach:**
```dart
onPressed: () async {
  await orderRepository.cancel(orderId);
  if (context.mounted) Navigator.of(context).pop();
}
```
**Rule:** Any `BuildContext` used after an `await` must be guarded with `if (context.mounted)` (or `if (mounted)` in a `State`). The analyzer's `use_build_context_synchronously` lint must stay clean — never suppress it.

---

### [AP-005] Missing const constructors on static widgets
**Added:** 2026-10-03 | **Source:** seed rule
**Pattern to avoid:**
```dart
Widget build(BuildContext context) {
  return Padding(
    padding: EdgeInsets.all(16),       // not const — rebuilt every frame
    child: Text('No orders yet'),      // not const
  );
}
```
**Correct approach:**
```dart
Widget build(BuildContext context) {
  return const Padding(
    padding: EdgeInsets.all(16),
    child: Text('No orders yet'),
  );
}
```
**Rule:** Every widget/constructor that takes no runtime-dependent arguments must be `const`. This is not cosmetic — it lets Flutter skip rebuilding that subtree entirely. Flag any missing `const` the compiler would accept.

---

<!-- New anti-patterns are added here via: npm run feedback:submit -->
