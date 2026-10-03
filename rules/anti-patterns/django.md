# Django Anti-Patterns

Confirmed mistakes from real usage. The `django-forge` / `django-reviewer` agents
load this file before generating or reviewing Django + DRF code.

---

## Anti-Patterns

### [AP-001] Never use FloatField for monetary values
**Added:** 2026-09-30 | **Source:** seed rule
**Pattern to avoid:**
```python
amount = models.FloatField()
```
**Correct approach:**
```python
amount = models.DecimalField(max_digits=18, decimal_places=4)
```
**Rule:** ALL monetary fields must use `DecimalField`. `FloatField` introduces floating-point rounding errors in financial calculations.

---

### [AP-002] Never hard delete — always soft delete
**Added:** 2026-09-30 | **Source:** seed rule
**Pattern to avoid:**
```python
order.delete()  # permanent, unrecoverable
```
**Correct approach:**
```python
order.is_deleted = True
order.modified_by = request.user.username
order.save(update_fields=['is_deleted', 'modified_by', 'modified_at'])
```
**Rule:** Use soft deletes (set `is_deleted = True`). Override `destroy()` in ViewSets. Never call `.delete()` on financial records.

---

### [AP-003] Always filter out soft-deleted records in get_queryset
**Added:** 2026-09-30 | **Source:** seed rule
**Pattern to avoid:**
```python
def get_queryset(self):
    return Order.objects.all()  # returns deleted records
```
**Correct approach:**
```python
def get_queryset(self):
    return Order.objects.filter(is_deleted=False)
```
**Rule:** Every ViewSet's `get_queryset` must filter `is_deleted=False`. Create a base manager that does this automatically.

---

### [AP-004] Never return unbounded querysets — always paginate
**Added:** 2026-09-30 | **Source:** seed rule
**Pattern to avoid:**
```python
class OrderViewSet(ModelViewSet):
    pass  # no pagination_class set
```
**Correct approach:**
```python
class OrderViewSet(ModelViewSet):
    pagination_class = StandardPagination  # default 20, max 100
```
**Rule:** Every list-returning ViewSet must have `pagination_class` set. Use a shared `StandardPagination` class.

---

### [AP-005] Always eager-load relationships queried in a loop — avoid N+1
**Added:** 2026-10-03 | **Source:** seed rule
**Pattern to avoid:**
```python
def get_queryset(self):
    return Order.objects.filter(is_deleted=False)  # order.customer triggers a query per row
```
**Correct approach:**
```python
def get_queryset(self):
    return Order.objects.filter(is_deleted=False).select_related('customer').prefetch_related('items')
```
**Rule:** Use `select_related` for FK/one-to-one, `prefetch_related` for reverse FK/many-to-many, on every queryset whose serializer touches related fields.

---

### [AP-006] Celery tasks must be idempotent and take IDs, not model instances
**Added:** 2026-10-03 | **Source:** seed rule
**Pattern to avoid:**
```python
@shared_task
def process_payment(order):  # can't serialize a Django model reliably
    charge_card(order.amount)  # charges again on retry
```
**Correct approach:**
```python
@shared_task(bind=True, max_retries=3)
def process_payment(self, order_id):
    order = Order.objects.get(id=order_id)
    if order.status != OrderStatus.PENDING:
        return  # already processed — safe to retry
    charge_card(order.amount)
    order.status = OrderStatus.PAID
    order.save(update_fields=['status', 'modified_at'])
```
**Rule:** Pass primary keys to `.delay()`, never model instances. Every task that mutates financial state must check current status before acting, so retries and duplicate dispatch are safe.

---

<!-- New anti-patterns are added here via: npm run feedback:submit -->
