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

<!-- New anti-patterns are added here via: npm run feedback:submit -->
