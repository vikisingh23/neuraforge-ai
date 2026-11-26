# Additional Patterns (from production codebases) — templates

Loaded on demand by the `django-forge` agent. Moved out of `agents/django-forge.md` so the agent prompt stays small.

## Template 1

```python
# core/exception.py — register in settings.py
def exception_handler(exc, context):
    from rest_framework.views import exception_handler as drf_exception_handler
    response = drf_exception_handler(exc, context)
    if isinstance(exc, Throttled):
        if exc.wait > 3600:
            msg = "Rate limit exceeded. Try again in 24 hours"
        elif exc.wait > 60:
            msg = "Rate limit exceeded. Try again in 1 hour"
        else:
            msg = f"Rate limit exceeded. Wait {exc.wait} seconds"
        response = ForbiddenJSONResponse(message=msg)
    return response

# settings.py
REST_FRAMEWORK = {
    'EXCEPTION_HANDLER': 'core.exception.exception_handler',
}
```

## Template 2

```python
# In repository — pessimistic locking
from django.db import transaction

@staticmethod
@transaction.atomic
def process_payment(order_id):
    order = Order.objects.select_for_update().get(id=order_id)
    if order.status != OrderStatus.PENDING:
        return  # Already processed (idempotent)
    order.status = OrderStatus.PROCESSING
    order.save()
    # ... process payment
```

## Template 3

```python
def group_required(*group_names):
    """Require user membership in at least one group"""
    def in_groups(user):
        if user.is_authenticated and (
            user.groups.filter(name__in=group_names).exists() or user.is_superuser
        ):
            return True
        return False
    return user_passes_test(in_groups)

# Usage
@group_required('admin', 'operations')
@api_view(["POST"])
def admin_action(request): ...
```

## Template 4

```python
class Attachment:
    """Standardized file upload handling"""
    def __init__(self, file):
        self.file = file
        self.validate()

    def validate(self):
        max_size = 10 * 1024 * 1024  # 10MB
        allowed_types = ['application/pdf', 'image/jpeg', 'image/png']
        if self.file.size > max_size:
            raise ValidationError("File too large (max 10MB)")
        if self.file.content_type not in allowed_types:
            raise ValidationError(f"Invalid file type: {self.file.content_type}")
```
