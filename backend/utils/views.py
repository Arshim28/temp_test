from django.http import HttpResponse, JsonResponse

from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView, View
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import status


from .serializers import (
    PlanSerializer,
    ReportPlanSerializer,
    TransactionSerializer,
    MaharashtraMetadataSerializer,
)
from .models import (
    Plan,
    ReportTransaction,
    Transaction,
    ReportPlan,
    MaharashtraMetadata,
)
from .helpers import get_metadata_state

from land_value.data_manager import all_manager

try:
    from terra_utils import Config

    config = Config(
        "/home/ubuntu/terraview-django/backend/submodules/land_value/config"
    )
except Exception as e:
    print(e)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_plan(request):
    user = request.user
    request.data["user"] = user.id
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
    request.data["user"] = user.id
    quantity = request.data.get(
        "quantity"
    )  # FIXME: Maybe add a condition later on for a fixed no. of quantities to allow.
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
        district = request.GET.get("district")
        taluka_name = request.GET.get("taluka_name")
        village_name = request.GET.get("village_name")

        if not all([district, taluka_name, village_name]):
            return JsonResponse(
                {
                    "error": "Missing required parameters: district, taluka_name, village_name"
                },
                status=400,
            )

        try:
            all_manager_obj = all_manager()
            data_manager = all_manager_obj.textual_data_manager

            khata_numbers = sorted(
                [
                    int(i)
                    for i in list(
                        set(
                            data_manager.get_khata_from_village(
                                district, taluka_name, village_name
                            )
                        )
                    )
                ]
            )
            return JsonResponse({"khata_numbers": khata_numbers})
        except Exception as e:
            return JsonResponse(
                {"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


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
    """Returns metadata for Maharashtra contains all the states, districts, talukas and villages."""

    def get(self, request):
        filters = {}
        state = request.query_params.get("state", None)
        district = request.query_params.get("district", None)
        taluka = request.query_params.get("taluka", None)
        village = request.query_params.get("village", None)

        if state:
            filters["state_name"] = state.upper()
        if district:
            filters["district_name"] = district.upper()
        if taluka:
            filters["taluka_name"] = taluka
        if village:
            filters["village_name"] = village

        data = MaharashtraMetadata.objects.using("external_db").filter(**filters)
        serializer = MaharashtraMetadataSerializer(data, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(["GET"])
def maharashtra_hierarchy(request):
    request_params = request.GET
    hierarchy = get_metadata_state(request_params)
    return JsonResponse(hierarchy, status=200, safe=False)


@api_view(["GET"])
def report_gen(request):
    """Generates a PDF report for a single entity based on query parameters."""

    required_params = ["state", "district", "taluka", "village", "khata_no"]
    query_params = {param: request.query_params.get(param) for param in required_params}

    missing_params = [param for param, value in query_params.items() if not value]
    if missing_params:
        return Response(
            {"detail": f"Missing query parameters: {', '.join(missing_params)}"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        query_params["khata_no"] = int(
            query_params["khata_no"]
        )  # Ensure khata_no is an integer
    except ValueError:
        return Response(
            {"detail": "khata_no must be a valid integer"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    string_params = ["state", "district", "taluka", "village"]
    query_params.update(
        {
            key: value.lower()
            for key, value in query_params.items()
            if key in string_params
        }
    )

    all_manager_obj = all_manager()
    pdf = all_manager_obj.get_plot_pdf_by_khata(**query_params)

    if not pdf:
        return Response(
            {"detail": "Failed to generate report"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    filename = f"{query_params['village']}_{query_params['khata_no']}_plot.pdf"
    response = HttpResponse(pdf.getvalue(), content_type="application/pdf")
    response["Content-Disposition"] = f'attachment; filename="{filename}"'

    return response


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def report_gen3(request):
    """Generates a report for a single entity with access validation and transaction tracking."""

    user = request.user
    params = {
        key: request.query_params.get(key, "").strip().lower()
        for key in ["state", "district", "taluka", "village"]
    }
    survey_no = request.query_params.get("survey_no")

    if not survey_no or any(not v for v in params.values()):
        return Response(
            {"detail": "Invalid query parameters"}, status=status.HTTP_400_BAD_REQUEST
        )

    try:
        survey_no = int(survey_no)
    except ValueError:
        return Response(
            {"detail": "Invalid survey number"}, status=status.HTTP_400_BAD_REQUEST
        )

    valid_plans = [p for p in user.plans.all() if p.is_valid]

    if not valid_plans:
        return Response(
            {"detail": "No valid plans found for the user"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    pdf = all_manager().get_plot_pdf_by_khata(**params, khata_no=survey_no)

    if pdf:
        ReportTransaction.objects.create(user=user, plan=valid_plans[0])
        response = HttpResponse(pdf.getvalue(), content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="{survey_no}_plot.pdf"'
        return response

    return Response(
        {"error": "Failed to generate report"}, status=status.HTTP_400_BAD_REQUEST
    )


@api_view(["GET"])
def get_plot_by_lat_lng(request):
    lat = request.query_params.get("lat")
    lng = request.query_params.get("lng")
    state = "maharashtra"
    if state in request.query_params:
        state = request.query_params.get("state")
    coordinates = {"lat": float(lat), "lng": float(lng)}

    all_manager_obj = all_manager()
    entries = all_manager_obj.get_plot_by_lat_lng(state, coordinates)
    if not entries:
        return Response(
            {"error": "No plots found for the given coordinates"},
            status=status.HTTP_404_NOT_FOUND,
        )
    details = []
    for khata in entries:
        details.append(
            {
                "khata_no": khata,
                "village_name": entries[khata]["village"],
                "owner_names": entries[khata]["owner_name_english"],
                "district": entries[khata]["district"],
                "taluka": entries[khata]["taluka"],
            }
        )

    return Response(details, status=status.HTTP_200_OK)
