# React Native Anti-Patterns

Confirmed mistakes from real usage. The `rn-forge` / `rn-reviewer` agents
load this file before generating or reviewing React Native code.

---

## Anti-Patterns

### [AP-001] Never call setState after component unmount
**Added:** 2026-09-30 | **Source:** seed rule
**Pattern to avoid:**
```tsx
useEffect(() => {
  fetchData().then(data => setOrders(data));  // no cleanup — setState after unmount
}, []);
```
**Correct approach:**
```tsx
// Use React Query — handles cancellation automatically
const { data } = useQuery({ queryKey: ['orders'], queryFn: ordersService.getAll });

// Or if imperative fetch is required:
useEffect(() => {
  let cancelled = false;
  fetchData().then(data => { if (!cancelled) setOrders(data); });
  return () => { cancelled = true; };
}, []);
```
**Rule:** React Query handles cancellation. For imperative async, always add a `cancelled` flag and check it before `setState`.

---

### [AP-002] Never put FlatList inside ScrollView
**Added:** 2026-09-30 | **Source:** seed rule
**Pattern to avoid:**
```tsx
<ScrollView>
  <FlatList data={items} renderItem={...} />  // nested VirtualizedLists — crash
</ScrollView>
```
**Correct approach:**
```tsx
// Use FlatList's ListHeaderComponent and ListFooterComponent instead
<FlatList
  data={items}
  ListHeaderComponent={<Header />}
  ListFooterComponent={<Footer />}
  renderItem={...}
/>
```
**Rule:** Never nest `FlatList`/`SectionList` inside `ScrollView`. Use `ListHeaderComponent` and `ListFooterComponent` instead.

---

### [AP-003] Always use typed navigation — never use any
**Added:** 2026-09-30 | **Source:** seed rule
**Pattern to avoid:**
```tsx
const navigation = useNavigation<any>();
navigation.navigate('OrderDetail', { id: order.id });
```
**Correct approach:**
```tsx
type Props = NativeStackScreenProps<RootStackParamList, 'OrderList'>;

export function OrderListScreen({ navigation }: Props) {
  navigation.navigate('OrderDetail', { orderId: order.orderId });
}
```
**Rule:** All navigation must be fully typed using `NativeStackScreenProps`. Never use `any` for navigation types.

---

### [AP-004] Never hardcode colors, spacing, or font sizes in StyleSheet
**Added:** 2026-10-03 | **Source:** seed rule
**Pattern to avoid:**
```tsx
<ActivityIndicator size="large" color="#1976D2" />
const styles = StyleSheet.create({ card: { padding: 16, backgroundColor: '#fff' } });
```
**Correct approach:**
```tsx
import { colors, spacing } from '../theme/tokens'; // from get_design_tokens

<ActivityIndicator size="large" color={colors.brand.primary} />
const styles = StyleSheet.create({ card: { padding: spacing.md, backgroundColor: colors.surface } });
```
**Rule:** Always use design tokens from `get_design_tokens`, both in `StyleSheet.create` values and in inline component props (e.g. `ActivityIndicator`'s `color`). Never hardcode hex values or raw numbers for spacing.

---

### [AP-005] Every data-driven screen must handle all 4 UX states
**Added:** 2026-10-03 | **Source:** seed rule
**Pattern to avoid:**
```tsx
const { data } = useOrders({ page });
return <FlatList data={data.items} renderItem={...} />; // crashes while loading, blank on error/empty
```
**Correct approach:**
```tsx
const { data, isLoading, isError, refetch } = useOrders({ page });

if (isLoading) return <ActivityIndicator />;             // loading
if (isError) return <ErrorRetry onRetry={refetch} />;    // error
if (!data?.items.length) return <EmptyState ... />;      // empty
return <FlatList data={data.items} renderItem={...} />;  // data
```
**Rule:** All 4 states (loading, error, empty, data) are mandatory on every screen that fetches data — not just the happy path.

---

<!-- New anti-patterns are added here via: npm run feedback:submit -->
