from rest_framework.serializers import ModelSerializer, SerializerMethodField
from shapely.lib import is_valid
from utils.models import (
    Plan,
    Transaction,
    MaharashtraMetadata,
    ReportPlan,
    ReportTransaction
)


class PlanSerializer(ModelSerializer):
    is_valid = SerializerMethodField()  # Read-only field for the `is_valid` property
    valid_till = SerializerMethodField()  # Read-only field for `valid_till`
    total_transactions = SerializerMethodField()  # Read-only field for `total_transactions`

    class Meta:
        model = Plan
        fields = [
            "id",
            "created_at",
            "updated_at",
            "plan_type",
            "entity_name",
            "user",
            "is_valid",
            "valid_till",
            "total_transactions",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "is_valid", "valid_till", "total_transactions"]

    def get_is_valid(self, obj):
        """Retrieve the `is_valid` property of the Plan model."""
        return obj.is_valid

    def get_valid_till(self, obj):
        """Retrieve the `valid_till` property of the Plan model."""
        return obj.valid_till

    def get_total_transactions(self, obj):
        """Retrieve the `total_transactions` property of the Plan model."""
        return obj.total_transactions


class ReportPlanSerializer(ModelSerializer):
    is_valid = SerializerMethodField()  # Read-only field for the `is_valid` property
    valid_till = SerializerMethodField()  # Read-only field for `valid_till`
    total_transactions = SerializerMethodField()  # Read-only field for `total_transactions`

    class Meta:
        model = ReportPlan
        fields = ["id", "created_at", "updated_at", "plan", "details"]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_is_valid(self, obj):
        """Retrieve the `is_valid` property of the Plan model."""
        return obj.plan.is_valid

    def get_valid_till(self, obj):
        """Retrieve the `valid_till` property of the Plan model."""
        return obj.plan.valid_till

    def get_total_transactions(self, obj):
        """Retrieve the `total_transactions` property of the Plan model."""
        return obj.plan.total_transactions




class TransactionSerializer(ModelSerializer):
    class Meta:
        model = Transaction
        fields = ["id", "created_at", "updated_at", "plan", "details"]
        read_only_fields = ["id", "created_at", "updated_at"]



class MaharashtraMetadataSerializer(ModelSerializer):
    class Meta:
        model = MaharashtraMetadata
        fields = ['state_name', 'district_name', 'taluka_name', 'village_name']