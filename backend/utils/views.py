import time
from collections import defaultdict

from django.http import HttpResponse, JsonResponse

from rest_framework.generics import CreateAPIView, ListAPIView, RetrieveAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView, View
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import status
from rest_framework.exceptions import ValidationError


from .serializers import PlanSerializer, ReportPlanSerializer, TransactionSerializer, MaharashtraMetadataSerializer
from .models import Plan, ReportTransaction, Transaction, ReportPlan, ALLOWED_TRANSACTIONS, MaharashtraMetadata
from .helpers import get_metadata_state

from land_value.data_manager import all_manager

try:
    from terra_utils import Config
    config = Config('/home/ubuntu/terraview-django/backend/submodules/land_value/config')
except Exception as e:
    print(e)

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_plan(request):
    user = request.user
    request.data['user'] = user.id
    serializer = PlanSerializer(data=request.data)

    if serializer.is_valid():
        plan_type = serializer.validated_data.get("plan_type")
        entity_name = serializer.validated_data.get("entity_name")

        print(plan_type, entity_name)

        # Validate entity_name based on plan_type
        entity_field_mapping = {
            "District": "district_name",
            "Taluka": "taluka_name",
            "Village": "village_name",
        }

        if plan_type not in entity_field_mapping:
            return Response({"plan_type": "Invalid plan type provided."}, status=400)

        filter_kwargs = {entity_field_mapping[plan_type]: entity_name}
        if not MaharashtraMetadata.objects.filter(**filter_kwargs).exists():
            return Response(
                {
                    "entity_name": f"The specified entity '{entity_name}' does not exist in the database for the plan type '{plan_type}'."
                },
                status=400,
            )

        serializer.save(user=user)
        return Response(serializer.data, status=201)

    print(serializer.errors)
    return Response(serializer.errors, status=400)



@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_report_plan(request):
    user = request.user
    request.data['user'] = user.id
    quantity = request.data.get("quantity") # FIXME: Maybe add a condition later on for a fixed no. of quantities to allow.
    serializer = ReportPlanSerializer(data=request.data)

    if serializer.is_valid():
        serializer.save(user=user)
        return Response(serializer.data, status=201)

    return Response(serializer.errors, status=400)


class ListReportPlansView(ListAPIView):
    serializer_class = ReportPlanSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return ReportPlan.objects.filter(user=self.request.user)

class KhataNumbersView(View):
    def get(self, request):
        district = request.GET.get('district')
        taluka_name = request.GET.get('taluka_name')
        village_name = request.GET.get('village_name')

        if not all([district, taluka_name, village_name]):
            return JsonResponse({'error': 'Missing required parameters: district, taluka_name, village_name'}, status=400)

        try:
            all_manager_obj = all_manager()
            data_manager = all_manager_obj.textual_data_manager

            khata_numbers = sorted([int(i) for i in list(set(data_manager.get_khata_from_village(district, taluka_name, village_name)))])
            return JsonResponse({'khata_numbers': khata_numbers})
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)



class ListPlansView(ListAPIView):
    serializer_class = PlanSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Plan.objects.filter(user=self.request.user)


class RetrievePlanView(RetrieveAPIView):
    queryset = Plan.objects.all()
    serializer_class = PlanSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Plan.objects.filter(user=self.request.user)

class RetrieveReportPlanView(RetrieveAPIView):
    queryset = ReportPlan.objects.all()
    serializer_class = ReportPlanSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return ReportPlan.objects.filter(user=self.request.user)


class CreateTransactionView(CreateAPIView):
    # NOTE: Shouldn't be necessary as get_report creates the transactions
    queryset = Transaction.objects.all()
    serializer_class = TransactionSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        """
        Override perform_create to validate transaction limits
        before saving the transaction.
        """
        user = self.request.user
        plans = user.plans.all()

        for plan in plans:
            total_transactions = plan.total_transactions

            if total_transactions >= ALLOWED_TRANSACTIONS[plan.plan_type]:
                raise ValidationError(
                    {
                        "detail": (
                            f"You have exceeded the allowed transactions for the {plan.plan_type} plan. "
                            f"Allowed: {ALLOWED_TRANSACTIONS[plan.plan_type]}, Used: {total_transactions}."
                        )
                    }
                )

        serializer.save(user=user)


class ListTransactionsView(ListAPIView):
    serializer_class = TransactionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        Return all transactions for the authenticated user.
        """
        return Transaction.objects.filter(user=self.request.user)


class RetrieveTransactionView(RetrieveAPIView):
    queryset = Transaction.objects.all()
    serializer_class = TransactionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """
        Return the transaction only if it belongs to the authenticated user.
        """
        return Transaction.objects.filter(user=self.request.user)

class MaharashtraMetadataList(APIView):
    def get(self, request):
        filters = {}
        state = request.query_params.get('state', None)
        district = request.query_params.get('district', None)
        taluka = request.query_params.get('taluka', None)
        village = request.query_params.get('village', None)

        if state:
            filters['state_name'] = state.upper()
        if district:
            filters['district_name'] = district.upper()
        if taluka:
            filters['taluka_name'] = taluka
        if village:
            filters['village_name'] = village

        data = MaharashtraMetadata.objects.using('external_db').filter(**filters)
        serializer = MaharashtraMetadataSerializer(data, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(["GET"])
def maharashtra_hierarchy(request):
    request_params = request.GET
    hierarchy = get_metadata_state(request_params)
    return JsonResponse(hierarchy, status=200, safe=False)



@api_view(["GET"])
def report_gen(request):
    """Generates report for a single entity"""
    user = request.user

    state = request.query_params.get("state")
    district = request.query_params.get("district")
    taluka = request.query_params.get("taluka")
    village = request.query_params.get("village")
    survey_no = request.query_params.get("survey_no")


    if not state or not district or not taluka or not village or  survey_no is None:
        print(state, district, taluka, village, survey_no)
        return Response({"detail": "Invalid query params"}, status=status.HTTP_400_BAD_REQUEST)

    state = state.lower()
    district = district.lower()
    taluka = taluka.lower()
    village = village.lower()
    #survey_no = int(survey_no)

    all_manager_obj = all_manager()
    pdf = all_manager_obj.get_plot_pdf_by_khata(state=state, district=district, taluka=taluka, village=village, khata_no=survey_no)
    response = HttpResponse(pdf.getvalue(), content_type="application/pdf")
    response["Content-Disposition"] = f'attachment; filename="{survey_no}_plot.pdf"'

    return response


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def report_gen3(request):
    """Generates a report for a single entity with access validation and transaction tracking."""

    user = request.user
    params = {key: request.query_params.get(key, "").strip().lower() for key in ["state", "district", "taluka", "village"]}
    survey_no = request.query_params.get("survey_no")

    if not survey_no or any(not v for v in params.values()):
        return Response({"detail": "Invalid query parameters"}, status=status.HTTP_400_BAD_REQUEST)

    try:
        survey_no = int(survey_no)
    except ValueError:
        return Response({"detail": "Invalid survey number"}, status=status.HTTP_400_BAD_REQUEST)

    valid_plans = [p for p in user.plans.all() if p.is_valid]

    if not valid_plans:
        return Response({"detail": "No valid plans found for the user"}, status=status.HTTP_400_BAD_REQUEST)

    pdf = all_manager().get_plot_pdf_by_khata(**params, khata_no=survey_no)

    if pdf:
        ReportTransaction.objects.create(user=user, plan=valid_plans[0])
        response = HttpResponse(pdf.getvalue(), content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="{survey_no}_plot.pdf"'
        return response

    return Response({"error": "Failed to generate report"}, status=status.HTTP_400_BAD_REQUEST)


@api_view(["GET"])
def get_plot_by_lat_lng(request):
    start_f = time.perf_counter()
    lat = request.query_params.get("lat")
    lng = request.query_params.get("lng")
    state = "maharashtra"
    if state in request.query_params:
        state = request.query_params.get("state")
    coordinates= {
        "lat": float(lat),
        "lng": float(lng)
    }

    all_manager_obj = all_manager()
    entries = all_manager_obj.get_plot_by_lat_lng(state, coordinates)
    if not entries:
        return Response({"error": "No plots found for the given coordinates"}, status=status.HTTP_404_NOT_FOUND)
    details = []
    for khata in entries:
        details.append({
            "khata_no": khata,
            "village_name": entries[khata]['village'],
            "owner_names":entries[khata]['owner_name_english'],
            "district" : entries[khata]['district'],
            "taluka" : entries[khata]['taluka'],
        })


    return Response(details, status=status.HTTP_200_OK)





@api_view(["GET"])
def get_metadata(request):
    """Get all metadata in district -> taluka -> village format"""

    # Fetch metadata
    metadata = MaharashtraMetadata.objects.using('external_db').all().values("district_name", "taluka_name", "village_name")

    # Initialize a defaultdict to structure the data
    result = defaultdict(lambda: defaultdict(list))

    # Loop through the metadata and organize it
    for record in metadata:
        district = record['district_name']
        taluka = record['taluka_name']
        village = record['village_name']

        # Populate the nested dictionary
        result[district][taluka].append(village)

    # Convert defaultdict to a normal dictionary
    result_dict = {district: dict(talukas) for district, talukas in result.items()}

    return Response(result_dict, status=status.HTTP_200_OK)
