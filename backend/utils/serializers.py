from rest_framework.serializers import ModelSerializer, SerializerMethodField
from utils.models import Plan, Transaction, District, Taluka, Village, MaharashtraMetadata


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


class TransactionSerializer(ModelSerializer):
    class Meta:
        model = Transaction
        fields = ["id", "created_at", "updated_at", "plan", "details"]
        read_only_fields = ["id", "created_at", "updated_at"]


class DistrictSerializer(ModelSerializer):
    class Meta:
        model = District
        fields = ["id", "name"]


class VillageSerializer(ModelSerializer):
    class Meta:
        model = Village
        fields = ["id", "name"]


class TalukaSerializer(ModelSerializer):
    class Meta:
        model = Taluka
        fields = ["id", "name"]

class MaharashtraMetadataSerializer(ModelSerializer):
    class Meta:
        model = MaharashtraMetadata
        fields = ['state_name', 'district_name', 'taluka_name', 'village_name']