import uuid
from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()

# TODO: Make id field on order model an uuid.UUIDField

class OrderStatus(models.TextChoices):
    PENDING = "PENDING", "Pending"
    COMPLETED = "COMPLETED", "Completed"
    FAILED = "FAILED", "Failed"


class BaseOrder(models.Model):
    """Abstract base model for orders."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    order_product = models.CharField(max_length=100) # TODO: Unnecessary?
    order_amount = models.DecimalField(
        max_digits=10, decimal_places=2
    )  # Use Decimal for currency
    order_payment_id = models.CharField(
        max_length=100, unique=True
    )  # Ensure unique payment IDs
    status = models.CharField(
        max_length=10, choices=OrderStatus.choices, default=OrderStatus.PENDING
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True  # This ensures the model won't create a table
        verbose_name = "Order"
        verbose_name_plural = "Orders"

    def __str__(self):
        return f"{self.order_product} - {self.get_status_display()}"


class MVPlanOrder(BaseOrder):
    """Order model for Map-View plans."""

    user = models.ForeignKey(
        User, related_name="mv_orders", on_delete=models.CASCADE, db_index=True
    )
    fixed_plan = models.ForeignKey(
        "payments.FixedMVPlans",
        related_name="mv_orders",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
    )

    class Meta:
        verbose_name = "Map-View Plan Order"
        verbose_name_plural = "Map-View Plan Orders"


class ReportPlanOrder(BaseOrder):
    """Order model for Report plans."""

    user = models.ForeignKey(
        User, related_name="report_orders", on_delete=models.CASCADE, db_index=True
    )
    fixed_plan = models.ForeignKey(
        "payments.FixedReportPlans",
        related_name="report_orders",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
    )

    class Meta:
        verbose_name = "Report Plan Order"
        verbose_name_plural = "Report Plan Orders"


class FixedMVPlans(models.Model):
    """Plans that are set by the admin contains the plan name and the price"""

    # id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    plan_name = models.CharField(max_length=100)
    entity_type = models.CharField(max_length=100)
    entity_name = models.CharField(max_length=100)
    price = models.DecimalField(max_digits=10, decimal_places=2)  # in rupees
    details = models.JSONField(null=True, blank=True)  # plan breakdown

    def __str__(self):
        return self.plan_name

    class Meta:
        verbose_name = "Fixed Map-View Plan"
        verbose_name_plural = "Fixed Map-View Plans"


class FixedReportPlans(models.Model):
    """Plans that are set by the admin contains the plan name and the price"""

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    plan_name = models.CharField(max_length=100)
    quantity = models.IntegerField()
    price = models.DecimalField(max_digits=10, decimal_places=2)  # in Rupees
    details = models.JSONField(null=True, blank=True)  # plan breakdown

    def __str__(self):
        return self.plan_name

    class Meta:
        verbose_name = "Fixed Report Plan"
        verbose_name_plural = "Fixed Report Plans"
