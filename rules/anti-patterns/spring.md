# Spring Boot Anti-Patterns

Confirmed mistakes from real usage. The `spring-forge` / `spring-reviewer` agents
load this file before generating or reviewing Spring Boot + JPA code.

---

## Anti-Patterns

### [AP-001] Never use double or float for monetary fields
**Added:** 2026-09-30 | **Source:** seed rule
**Pattern to avoid:**
```java
private double amount;
private float price;
```
**Correct approach:**
```java
@Column(precision = 18, scale = 4)
private BigDecimal amount;
```
**Rule:** Always use `BigDecimal` for monetary values. Never `double` or `float`. Use `precision=18, scale=4` for all money columns.

---

### [AP-002] Never expose JPA entities directly from controllers
**Added:** 2026-09-30 | **Source:** seed rule
**Pattern to avoid:**
```java
@GetMapping("/{id}")
public Order getById(@PathVariable Long id) {
    return orderRepository.findById(id).orElseThrow();
}
```
**Correct approach:**
```java
@GetMapping("/{id}")
public ResponseEntity<OrderDto> getById(@PathVariable Long id) {
    return ResponseEntity.ok(orderService.getById(id));
}
```
**Rule:** Never return JPA entities from REST controllers. Always map to DTOs. Use MapStruct for mapping.

---

### [AP-003] Always use @Transactional on service methods that write
**Added:** 2026-09-30 | **Source:** seed rule
**Pattern to avoid:**
```java
public OrderDto create(CreateOrderDto dto, String createdBy) {
    // multiple DB operations without transaction — partial failure possible
    Order order = mapper.toEntity(dto);
    orderRepository.save(order);
    auditRepository.log(order);
}
```
**Correct approach:**
```java
@Transactional
public OrderDto create(CreateOrderDto dto, String createdBy) {
    Order order = mapper.toEntity(dto);
    orderRepository.save(order);
    auditRepository.log(order);
    return mapper.toDto(order);
}
```
**Rule:** Any service method that writes to more than one table must be `@Transactional`. Read-only methods should use `@Transactional(readOnly = true)`.

---

### [AP-004] Never use Page<Entity> — return Page<DTO>
**Added:** 2026-09-30 | **Source:** seed rule
**Pattern to avoid:**
```java
public Page<Order> getAll(Pageable pageable) {
    return orderRepository.findAll(pageable);
}
```
**Correct approach:**
```java
public Page<OrderDto> getAll(Pageable pageable) {
    return orderRepository.findAll(pageable).map(mapper::toDto);
}
```
**Rule:** Map entity pages to DTO pages before returning. Use `.map(mapper::toDto)` on the `Page` result.

---

<!-- New anti-patterns are added here via: npm run feedback:submit -->
