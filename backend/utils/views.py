from email.policy import HTTP
import jwt

from django.utils import timezone
from django.http import HttpResponse, JsonResponse
from django.db import transaction, IntegrityError
from django.views.decorators.http import require_http_methods

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
from .helpers import get_metadata_state, has_plan_access, get_report_access_plan
from land_value.data_manager.all_manager.mh_all_manager import mh_all_manager
import urllib.parse

# pyright: reportAttributeAccessIssue=false

try:
    from terra_utils import Config

    config = Config(
        "/home/ubuntu/terraview-django/backend/submodules/land_value/config"
    )
except Exception as e:
    print(e)


@require_http_methods(["HEAD", "GET"])
def health_check(request):
    return HttpResponse(status=200)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_plan(request):  # API not used.
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
def create_report_plan(request):  # API not used.
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


class KhataNumbersView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        district = urllib.parse.unquote(request.GET.get("district", ""))
        taluka_name = urllib.parse.unquote(request.GET.get("taluka_name", ""))
        village_name = urllib.parse.unquote(request.GET.get("village_name", ""))

        if not all([district, taluka_name, village_name]):
            return JsonResponse(
                {
                    "error": "Missing required parameters: district, taluka_name, village_name"
                },
                status=400,
            )

        try:
            all_manager_obj = mh_all_manager()
            khata_numbers = sorted(
                [
                    int(i)
                    for i in list(
                        set(
                            all_manager_obj.get_khata_from_village(
                                district, taluka_name, village_name
                            )
                        )
                    )
                ]
            )
            
            # Get gat numbers using the function from mh_all_manager
            gat_numbers = []
            try:
                gat_numbers = sorted(
                    [
                        str(i)
                        for i in list(
                            set(
                                all_manager_obj.get_gat_from_village(
                                    district, taluka_name, village_name
                                )
                            )
                        )
                    ]
                )
            except Exception as e:
                print(f"Error fetching gat numbers: {e}")
            
            # Get survey numbers using the function from mh_all_manager
            survey_numbers = []
            try:
                survey_numbers = sorted(
                    [
                        str(i)
                        for i in list(
                            set(
                                all_manager_obj.get_survey_from_village(
                                    district, taluka_name, village_name
                                )
                            )
                        )
                    ]
                )
            except Exception as e:
                print(f"Error fetching survey numbers: {e}")
            
            print(f"Found {len(khata_numbers)} khata numbers, {len(gat_numbers)} gat numbers, {len(survey_numbers)} survey numbers")
            return JsonResponse({
                "khata_numbers": khata_numbers,
                "gat_numbers": gat_numbers,
                "survey_numbers": survey_numbers
            })
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

    permission_classes = [IsAuthenticated]

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
# @permission_classes([IsAuthenticated])
def maharashtra_hierarchy(request):
    hierarchy = get_metadata_state()
    return JsonResponse(hierarchy, status=200, safe=False)


@api_view(["GET"])
# @permission_classes([IsAuthenticated])
def report_gen(request):
    """Generates a PDF report for a single entity based on query parameters."""

    # required_params = ["state", "district", "taluka", "village", "khata_no"]
    # query_params = {param: request.query_params.get(param) for param in required_params}

    plot_id = request.query_params.get("plot_id")

    # missing_params = [param for param, value in query_params.items() if not value]
    if not plot_id:
        return Response(
            {"detail": f"Missing query parameters: plot_id"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    all_manager_obj = mh_all_manager()
    pdf = all_manager_obj.get_plot_pdf_by_plot_id(plot_id)

    if not pdf:
        return Response(
            {"detail": "Failed to generate report"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    filename = f"{plot_id}_plot.pdf"
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
    }  # NOTE: Required to save the transaction.

    khata_no = request.query_params.get("khata_no")
    plot_id = request.query_params.get("plot_id")

    if not khata_no or any(not v for v in params.values()):
        return Response(
            {"detail": "Invalid query parameters"}, status=status.HTTP_400_BAD_REQUEST
        )

    if not plot_id:
        return Response(
            {"detail": "Invalid query parameters"}, status=status.HTTP_400_BAD_REQUEST
        )

    plan = get_report_access_plan(user)

    if not plan:
        return Response(
            {"detail": "User does not have access to any plan"},
            status=status.HTTP_403_FORBIDDEN,
        )

    all_manager_obj = mh_all_manager()
    pdf = all_manager_obj.get_plot_pdf_by_plot_id(plot_id)

    if not pdf:
        return Response(
            {"error": "Failed to generate report"}, status=status.HTTP_400_BAD_REQUEST
        )
    try:
        with transaction.atomic():
            village = params.get("village")
            taluka = params.get("taluka")
            district = params.get("district")

            ReportTransaction.objects.create(
                report_plan=plan,
                khata_no=khata_no,
                village=village,
                taluka=taluka,
                district=district,
            )

            response = HttpResponse(pdf.getvalue(), content_type="application/pdf")
            response["Content-Disposition"] = (
                f'attachment; filename="{khata_no}_plot.pdf"'
            )
            return response

    except IntegrityError:
        return Response(
            {"error": "Failed to create report transaction"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
    except Exception as e:
        print(f"[ERROR]: An unexpected error occurred: {str(e)}")
        return Response(
            {"error": f"An unexpected error occurred: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
    response = HttpResponse(pdf.getvalue(), content_type="application/pdf")
    response["Content-Disposition"] = f'attachment; filename="{khata_no}_plot.pdf"'
    return response


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_tile_url(request):

    # TODO: Need to pass the table id as well in encrypted form to restrict access.
    user = request.user
    table = request.query_params.get("table") or "jalgaon.parola_cadastrals"
    table = table.strip()

    if has_plan_access(user, table):
        print("[INFO]: User has access to table")
        l_id = table
        SECRET_KEY = "tudu"  # FIXME: Load the secret key from the config

        payload = {
            "uid": str(user.id),
            "lid": l_id,
            "exp": timezone.now() + timezone.timedelta(minutes=10),
            "iat": timezone.now(),
        }

        # Generate the JWT token
        token = jwt.encode(payload, SECRET_KEY, algorithm="HS256")

        tile_url = (
            f"http://43.204.226.30:8088/{l_id}/{{z}}/{{x}}/{{y}}.pbf?token={token}"
        )

        print(tile_url)
        return Response({"tile_url": tile_url}, status=status.HTTP_200_OK)
    else:
        return Response(
            {"error": "Unauthorized"},
            status=status.HTTP_401_UNAUTHORIZED,
        )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_plot_by_lat_lng(request):
    lat = request.query_params.get("lat")
    lng = request.query_params.get("lng")
    state = "maharashtra"
    if state in request.query_params:
        state = request.query_params.get("state")
    coordinates = {"lng": float(lng), "lat": float(lat)}
    cad_manager = mh_all_manager().cadastral_manager
    entries = cad_manager.get_plot_by_lat_lng(coordinates, limit=10)
    if not entries:
        return Response(
            [],
            status=status.HTTP_404_NOT_FOUND,
        )
    print("[INFO]: lat-long sample entry: ", entries[0])

    details = []

    for entry in entries:
        details.append(
            {
                "khata_no": entry["khata_no"],
                "plot_id": entry["plot_id"],
                "gat_no": entry["gat_no"],
                "survey_no": entry["survey_no"],
                "owner_names": entry["owner_name_english"],
                "district": entry["district"],
                "taluka": entry["taluka"],
                "village_name": entry["village_name"],
            }
        )

    return Response(details, status=status.HTTP_200_OK)


@api_view(["GET"])
# @permission_classes([IsAuthenticated])
def get_khata_preview(request):
    """Get Khata Preview accepts district, taluka, village"""
    state = "maharashtra"
    district = urllib.parse.unquote(request.query_params.get("district", ""))
    taluka = urllib.parse.unquote(request.query_params.get("taluka", ""))
    village = urllib.parse.unquote(request.query_params.get("village", ""))
    print("[INFO]: Khata Preview, preview-params: ", state, district, taluka, village)


    if not all([state, district, taluka, village]):
        return Response(
            {"error": "Missing required parameters"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    mh_all_manager_obj = mh_all_manager()
    entries = mh_all_manager_obj.get_preview_from_village(district, taluka, village)

    print("[INFO]: Khata Preview, preview-sample-data: ", entries[0])
    details = []
    for entry in entries:
        details.append(
            {
                "khata_no": entry["khata_no"],
                "village_name": village,
                "owner_names": entry["owner_name_english"],
                "district": district,
                "taluka": taluka,
                "plot_id": entry["plot_id"],
                "gat_no": entry["gat_no"],
                "survey_no": entry["survey_no"],
            }
        )

    print("[INFO]: Khata Preview, preview-entries count: ", len(details))
    return Response(details, status=status.HTTP_200_OK)


# @api_view(["GET"])
# # @permission_classes([IsAuthenticated])
# def report_info_from_khata(request):
#     khata_no = request.query_params.get("khata_no")
#     # state = request.query_params.get("state")
#     village = request.query_params.get("village")
#     district = request.query_params.get("district")
#     taluka = request.query_params.get("taluka")

#     if not all([khata_no, village, district, taluka]):
#         return Response(
#             {"error": "Missing required parameters"},
#             status=status.HTTP_400_BAD_REQUEST,
#         )
#     all_manager_obj = mh_all_manager()
#     entries = all_manager_obj.get_info_from_khata(
#         district=district, village=village, taluka=taluka, khata_no=khata_no
#     )

#     print("[INFO]: Reports from khata, sample entry: ", entries[0])

#     details = []
#     for entry in entries:
#         details.append(
#             {
#                 "khata_no": khata_no,
#                 "village_name": village,
#                 "owner_names": entry["owner_name_english"],
#                 "district": district,
#                 "taluka": taluka,
#                 "plot_id": entry["plot_id"],
#                 "gat_no": entry["gat_no"],
#                 "survey_no": entry["survey_no"],
#             }
#         )

#     print("[INFO]: Reports from khata: entries count: ", len(details))
#     return Response(details, status=status.HTTP_200_OK)


# @permission_classes([IsAuthenticated])
@api_view(["GET"])
def report_info_from_khata(request):
    number = urllib.parse.unquote(request.query_params.get("number", ""))
    number_type = urllib.parse.unquote(request.query_params.get("type", ""))
    village = urllib.parse.unquote(request.query_params.get("village", ""))
    district = urllib.parse.unquote(request.query_params.get("district", ""))
    taluka = urllib.parse.unquote(request.query_params.get("taluka", ""))

    if not all([number, number_type, village, district, taluka]):
        return Response(
            {"error": "Missing required parameters"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    all_manager_obj = mh_all_manager()
    if number_type == "khata":
        entries = all_manager_obj.get_info_from_khata(
            district=district, village=village, taluka=taluka, khata_no=number
        )
    elif number_type == "gat":
        entries = all_manager_obj.get_info_from_gat(
            district=district, village=village, taluka=taluka, gat_no=number
        )
    elif number_type == "survey":
        entries = all_manager_obj.get_info_from_survey(
            district=district, village=village, taluka=taluka, survey_no=number
        )
    else:
        return Response(
            {"error": "Invalid number type"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not entries:
        return Response(
            {"error": "No entries found"},
            status=status.HTTP_404_NOT_FOUND,
        )

    print(f"[INFO]: Reports from {number_type}, sample entry: ", entries[0])

    details = []
    for entry in entries:
        details.append({
            # Make sure fields match exactly what frontend expects
            "khata_no": entry["khata_no"],
            "village_name": village,
            "owner_names": entry["owner_name_english"],  # Note this is now owner_names
            "district": district,
            "taluka": taluka,
            "plot_id": entry["plot_id"],
            "gat_no": entry["gat_no"],
            "survey_no": entry["survey_no"]
        })

    print(f"[INFO]: Reports from {number_type}: entries count: ", len(details))
    return Response(details, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_available_reports(request):
    """Retuns the no of reports the user can access and total no of reports"""
    user = request.user
    quantity = 0
    reports_downloaded = 0
    plans = ReportPlan.objects.filter(user=user)
    for plan in plans:
        quantity += plan.quantity
        reports_downloaded += plan.total_transactions
    return Response(
        {"quantity": quantity, "used": reports_downloaded}, status=status.HTTP_200_OK
    )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_khata_from_survey_view(request):
    """Returns khata numbers associated with a specific survey number"""
    district = urllib.parse.unquote(request.query_params.get("district", ""))
    taluka = urllib.parse.unquote(request.query_params.get("taluka", ""))
    village = urllib.parse.unquote(request.query_params.get("village", ""))
    survey_no = urllib.parse.unquote(request.query_params.get("survey_no", ""))

    if not all([district, taluka, village, survey_no]):
        return Response(
            {"error": "Missing required parameters"}, 
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        amo = mh_all_manager()
        khata_numbers = amo.get_khata_from_survey(district, taluka, village, survey_no)
        return Response({"khata_numbers": khata_numbers}, status=status.HTTP_200_OK)
    except Exception as e:
        print(f"Error getting khata from survey: {e}")
        return Response(
            {"error": str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(["GET"])
# @permission_classes([IsAuthenticated])
def search_report_by_gat(request):
    """Returns the reports by gat no"""
    gat_no = urllib.parse.unquote(request.query_params.get("gat_no", ""))
    district = urllib.parse.unquote(request.query_params.get("district", ""))
    taluka = urllib.parse.unquote(request.query_params.get("taluka", ""))
    village = urllib.parse.unquote(request.query_params.get("village", ""))

    if not all([gat_no, district, taluka, village]):
        return Response(
            {"error": "Missing required parameters"}, status=status.HTTP_400_BAD_REQUEST
        )

    amo = mh_all_manager()
    entries = amo.get_info_from_gat(district, taluka, village, gat_no)

    print(entries)

    return Response(entries, status=status.HTTP_200_OK)


@api_view(["GET"])
# @permission_classes([IsAuthenticated])
def search_report_by_survey(request):
    """Returns the reports by survey no"""

    district = urllib.parse.unquote(request.query_params.get("district", ""))
    taluka = urllib.parse.unquote(request.query_params.get("taluka", ""))
    village = urllib.parse.unquote(request.query_params.get("village", ""))
    survey_no = urllib.parse.unquote(request.query_params.get("survey_no", ""))


    if not all([district, taluka, village, survey_no]):
        return Response(
            {"error": "Missing required parameters"}, status=status.HTTP_400_BAD_REQUEST
        )

    amo = mh_all_manager()
    entries = amo.get_info_from_survey(district, taluka, village, survey_no)
    data = []

    for entry in entries:
        data.append(
            {
                "khata_no": entry["khata_no"],
                "plot_id": entry["plot_id"],
                "gat_no": entry["gat_no"],
                "survey_no": entry["survey_no"],
                "owner_names": entry["owner_name_english"],
                "district": district,
                "taluka": taluka,
                "village": village,
            }
        )

    return Response(data, status=status.HTTP_200_OK)
