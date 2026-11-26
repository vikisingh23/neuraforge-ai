# Code Patterns — templates

Loaded on demand by the `django-forge` agent. Moved out of `agents/django-forge.md` so the agent prompt stays small.

## Template 1

```python
from django.db import models
from django.utils import timezone
from simple_history.models import HistoricalRecords

class Order(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey('CustomUser', on_delete=models.CASCADE, related_name='orders')
    scheme_name = models.CharField(max_length=200)
    amount = models.DecimalField(max_digits=18, decimal_places=2)
    status = models.CharField(max_length=50, choices=OrderStatus.choices, default=OrderStatus.PENDING)

    # MANDATORY audit fields
    created_by = models.CharField(max_length=100)
    modified_by = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)
    modified_at = models.DateTimeField(auto_now=True)
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)

    # Audit history
    history = HistoricalRecords()

    class Meta:
        db_table = 'om_order'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['created_at']),
        ]

    def soft_delete(self, deleted_by):
        self.is_deleted = True
        self.deleted_at = timezone.now()
        self.modified_by = deleted_by
        self.save(update_fields=['is_deleted', 'deleted_at', 'modified_by', 'modified_at'])
```

## Template 2

```python
from core.repositories.base import BaseRepository
from core.models import Order
from core.helpers.model_search import get_or_none, filter_or_none

class OrderRepository(BaseRepository):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, model=Order, **kwargs)

    @staticmethod
    def get_by_user(user, status=None):
        qs = Order.objects.filter(user=user, is_deleted=False)
        if status:
            qs = qs.filter(status=status)
        return qs.order_by('-created_at')

    @staticmethod
    def create_order(user, data, created_by):
        return Order.objects.create(
            user=user,
            scheme_name=data['scheme_name'],
            amount=data['amount'],
            status=OrderStatus.PENDING,
            created_by=created_by,
            modified_by=created_by,
        )

    @staticmethod
    def get_paginated(user, page=1, page_size=20):
        qs = Order.objects.filter(user=user, is_deleted=False).order_by('-created_at')
        from django.core.paginator import Paginator
        paginator = Paginator(qs, page_size)
        return paginator.get_page(page), paginator.count
```

## Template 3

```python
import logging
from rest_framework.decorators import api_view
from django.contrib.auth.decorators import login_required

from core.repositories.order import OrderRepository
from core.serializers.order_serializer import OrderSerializer, CreateOrderSerializer
from core.helpers.base import SuccessJSONResponse, BadRequestJSONResponse, NotFoundJSONResponse
from core.helpers.decorators import handle_unknown_exception_api_view, validate_params
from core.helpers.validations.base import Schemas

LOGGER = logging.getLogger(__name__)

class OrderController:
    @staticmethod
    @api_view(["GET"])
    @login_required
    @handle_unknown_exception_api_view(logger=LOGGER)
    def list_orders(request):
        page = int(request.GET.get('page', 1))
        orders, total = OrderRepository.get_paginated(user=request.user, page=page)
        data = OrderSerializer(orders, many=True).data
        return SuccessJSONResponse({
            'items': data,
            'total_count': total,
            'page': page,
        })

    @staticmethod
    @api_view(["POST"])
    @login_required
    @validate_params(Schemas.CREATE_ORDER)
    @handle_unknown_exception_api_view(logger=LOGGER)
    def create_order(request):
        serializer = CreateOrderSerializer(data=request.data)
        if not serializer.is_valid():
            return BadRequestJSONResponse(reason=serializer.errors)
        order = OrderRepository.create_order(
            user=request.user,
            data=serializer.validated_data,
            created_by=str(request.user.id),
        )
        return SuccessJSONResponse(OrderSerializer(order).data, status=201)

    @staticmethod
    @api_view(["DELETE"])
    @login_required
    @handle_unknown_exception_api_view(logger=LOGGER)
    def delete_order(request, order_id):
        repo = OrderRepository(id=order_id, user=request.user, is_deleted=False)
        if not repo.item:
            return NotFoundJSONResponse(reason="Order not found")
        repo.item.soft_delete(deleted_by=str(request.user.id))
        return SuccessJSONResponse(None, status=204)
```

## Template 4

```python
from rest_framework import serializers
from core.models import Order

class OrderSerializer(serializers.ModelSerializer):
    class Meta:
        model = Order
        fields = ['id', 'scheme_name', 'amount', 'status', 'created_at', 'modified_at']

class CreateOrderSerializer(serializers.Serializer):
    scheme_name = serializers.CharField(max_length=200)
    amount = serializers.DecimalField(max_digits=18, decimal_places=2, min_value=500)
```

## Template 5

```python
from celery import shared_task
from core.repositories.order import OrderRepository

@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def process_order_payment(self, order_id):
    try:
        repo = OrderRepository(id=order_id)
        if not repo.item:
            return
        # Idempotency — skip if already processed
        if repo.item.status != OrderStatus.PENDING:
            return
        # Process payment...
    except Exception as exc:
        self.retry(exc=exc)
```

## Template 6

```python
# core/helpers/base.py — already exists in your codebase
class SuccessJSONResponse(JsonResponse):
    def __init__(self, data, status=200, **kwargs):
        super().__init__({'status': 'success', 'data': data}, status=status, **kwargs)

class BadRequestJSONResponse(JsonResponse):
    def __init__(self, reason, status=400, **kwargs):
        super().__init__({'status': 'error', 'message': reason}, status=status, **kwargs)

class NotFoundJSONResponse(JsonResponse):
    def __init__(self, reason, status=404, **kwargs):
        super().__init__({'status': 'error', 'message': reason}, status=status, **kwargs)
```
