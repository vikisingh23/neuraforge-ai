# .NET Anti-Patterns

Confirmed mistakes from real usage. The `forge` / `dotnet-reviewer` agents
load this file before generating or reviewing .NET code.

---

## Anti-Patterns

### [AP-001] Never use float or double for monetary values
**Added:** 2026-09-30 | **Source:** seed rule
**Pattern to avoid:**
```csharp
public double Amount { get; set; }
public float Price { get; set; }
```
**Correct approach:**
```csharp
[Column(TypeName = "decimal(18,4)")]
public decimal Amount { get; set; }
```
**Rule:** ALL monetary values must use `decimal` with `decimal(18,4)` column type. Never `float` or `double`. Financial data has strict precision requirements.

---

### [AP-002] Never hard delete financial data
**Added:** 2026-09-30 | **Source:** seed rule
**Pattern to avoid:**
```csharp
_context.Orders.Remove(order);
await _context.SaveChangesAsync();
```
**Correct approach:**
```csharp
order.IsDeleted = true;
order.ModifiedBy = currentUser;
order.ModifiedAt = DateTime.UtcNow;
await _context.SaveChangesAsync();
```
**Rule:** Always soft delete. Set `IsDeleted = true`. Financial entities must never be hard deleted — audit trails require full history.

---

### [AP-003] Always use ConfigureAwait(false) in library/service code
**Added:** 2026-09-30 | **Source:** seed rule
**Pattern to avoid:**
```csharp
var result = await _repository.GetAllAsync();
```
**Correct approach:**
```csharp
var result = await _repository.GetAllAsync().ConfigureAwait(false);
```
**Rule:** All async calls in service and repository layers must use `.ConfigureAwait(false)` to avoid deadlocks and improve performance.

---

### [AP-004] Controllers must be thin — no business logic
**Added:** 2026-09-30 | **Source:** seed rule
**Pattern to avoid:**
```csharp
// Controller doing validation, calculation, DB access
public async Task<IActionResult> Create(CreateOrderDto dto) {
  if (dto.Amount <= 0) return BadRequest("Amount must be positive");
  var existing = await _context.Orders.FirstOrDefaultAsync(o => o.CustomerId == dto.CustomerId);
  // ... 50 more lines of business logic
}
```
**Correct approach:**
```csharp
public async Task<IActionResult> Create(CreateOrderDto dto) {
  var order = await _orderService.CreateAsync(dto, User.Identity!.Name!).ConfigureAwait(false);
  return CreatedAtAction(nameof(GetById), new { orderId = order.OrderId }, order);
}
```
**Rule:** Controllers must only: receive input, call one service method, return a response. Max 150 lines total. All logic belongs in the service layer.

---

### [AP-005] Never expose EF Core entities directly from controllers
**Added:** 2026-09-30 | **Source:** seed rule
**Pattern to avoid:**
```csharp
public async Task<Order> GetById(int id) => await _context.Orders.FindAsync(id);
```
**Correct approach:**
```csharp
public async Task<OrderDto> GetById(int id) {
  var order = await _orderService.GetByIdAsync(id).ConfigureAwait(false);
  return order; // returns DTO, not entity
}
```
**Rule:** Always return DTOs from controllers, never EF Core entities. Entities expose internals and navigation properties that cause serialization issues.

---

<!-- New anti-patterns are added here via: npm run feedback:submit -->
