from rest_framework import serializers
from .models import (
    MVPlanOrder,
    ReportPlanOrder,
    OrderStatus,
    FixedMVPlans,
    FixedReportPlans,
)


class BaseOrderSerializer(serializers.ModelSerializer):
    """Base serializer for all order models."""

    status = serializers.ChoiceField(
        choices=OrderStatus.choices, default=OrderStatus.PENDING
    )
    created_at = serializers.ReadOnlyField()
    updated_at = serializers.ReadOnlyField()

    class Meta:
        fields = [
            "id",
            "user",
            "order_product",
            "order_amount",
            "order_payment_id",
            "status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class MVPlanOrderSerializer(BaseOrderSerializer):
    """Serializer for Map-View Plan orders."""

    class Meta(BaseOrderSerializer.Meta):
        model = MVPlanOrder


class ReportPlanOrderSerializer(BaseOrderSerializer):
    """Serializer for Report Plan orders."""

    class Meta(BaseOrderSerializer.Meta):
        model = ReportPlanOrder


class FixedMVPlansSerializer(serializers.ModelSerializer):
    class Meta:
        model = FixedMVPlans
        fields = ["id", "plan_name", "entity_type", "entity_name", "price", "details"]


class FixedReportPlansSerializer(serializers.ModelSerializer):
    class Meta:
        model = FixedReportPlans
        fields = ["id", "plan_name", "quantity", "price", "details"]
