from rest_framework.serializers import ModelSerializer

from utils.models import Plan, Transaction, District, Talluka, Village, MaharashtraMetadata


class PlanSerializer(ModelSerializer):
    class Meta:
        model = Plan
        fields = ["id", "created_at", "updated_at", "plan_type", "entity_name", "user"]
        read_only_fields = ["id", "created_at", "updated_at"]


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


class TallukaSerializer(ModelSerializer):
    class Meta:
        model = Talluka
        fields = ["id", "name"]

class MaharashtraMetadataSerializer(ModelSerializer):
    class Meta:
        model = MaharashtraMetadata
        fields = ['state_name', 'district_name', 'taluka_name', 'village_name']