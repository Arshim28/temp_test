
from collections import defaultdict
from rest_framework.generics import CreateAPIView, ListAPIView, RetrieveAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import status
from rest_framework.exceptions import ValidationError
from .serializers import PlanSerializer, TransactionSerializer, MaharashtraMetadataSerializer
from .models import Plan, Transaction, ALLOWED_TRANSACTIONS, MaharashtraMetadata    
from django.http import HttpResponse, JsonResponse
from django.db import transaction
from land_value.data_manager import *
try:
    from terra_utils import Config
    config = Config('/home/ubuntu/terraview-django/backend/submodules/land_value/config')
except Exception as e:
    print(e)

class CreatePlanView(CreateAPIView):
    queryset = Plan.objects.all()
    serializer_class = PlanSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        user = self.request.user
        plan_type = serializer.validated_data.get("plan_type")
        entity_name = serializer.validated_data.get("entity_name")

        # Validate entity_name based on plan_type
        if plan_type == "District":
            exists = MaharashtraMetadata.objects.filter(district_name=entity_name).exists()
        elif plan_type == "Taluka":
            exists = MaharashtraMetadata.objects.filter(taluka_name=entity_name).exists()
        elif plan_type == "Village":
            exists = MaharashtraMetadata.objects.filter(village_name=entity_name).exists()
        else:
            raise ValidationError({"plan_type": "Invalid plan type provided."})

        if not exists:
            raise ValidationError(
                {
                    "entity_name": f"The specified entity '{entity_name}' does not exist in the database for the plan type '{plan_type}'."
                }
            )


        serializer.save(user=user)


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

        data = MaharashtraMetadata.objects.filter(**filters)  
        serializer = MaharashtraMetadataSerializer(data, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)



def maharashtra_hierarchy(request):
    entries = MaharashtraMetadata.objects.all().values(
        'district_code', 'district_name',
        'taluka_code', 'taluka_name',
        'village_code', 'village_name'
    ).order_by('district_name', 'taluka_name', 'village_name')

    hierarchy = {}
    for entry in entries:
        d_code = entry['district_code']
        d_name = entry['district_name']
        t_code = entry['taluka_code']
        t_name = entry['taluka_name']
        v_code = entry['village_code']
        v_name = entry['village_name']

        district = hierarchy.setdefault(d_code, {
            'code': d_code,
            'name': d_name,
            'talukas': {}
        })

        taluka = district['talukas'].setdefault(t_code, {
            'code': t_code,
            'name': t_name,
            'villages': []
        })

        taluka['villages'].append({'code': v_code, 'name': v_name})

    result = []
    for district in hierarchy.values():
        talukas = list(district['talukas'].values())
        for taluka in talukas:
            taluka['villages'].sort(key=lambda v: v['name'])
        talukas.sort(key=lambda t: t['name'])
        result.append({
            'code': district['code'],
            'name': district['name'],
            'talukas': talukas
        })

    result.sort(key=lambda d: d['name'])

    return JsonResponse(result, safe=False)

@api_view(["GET"])
def report_gen(request):
    """Generates report for a single entity"""
    user = request.user
    print(user)
    
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
    survey_no = int(survey_no)

    all_manager_obj = all_manager()
    pdf = all_manager_obj.get_plot_pdf(state, district, taluka, village, survey_no)
    print(pdf)


    return HttpResponse(pdf, status=status.HTTP_200_OK)


@api_view(["GET"])
def report_gen2(request):
    """Generates report for a single entity"""
    if request.method == "GET":
        user = request.user
        plans = user.plans.all()
        talukas = []
        villages = []
        districts = []
        for p in plans:
            if p.is_valid:
                if p.plan_type == "Taluka":
                    metadata_objects = MaharashtraMetadata.objects.filter(taluka_name=p.entity)
                    for obj in metadata_objects:
                        if obj.village_name not in villages:
                            villages.append(obj.village_name)
                    talukas.append(p.entity)
                elif p.plan_type == "Village":
                    villages.append(p.entity)
                elif p.plan_type == "District":
                    for obj in metadata_objects:
                        if obj.taluka_name not in talukas:
                            talukas.append(obj.taluka_name)
                    villages.append(p.entity)
                    

        if len(plans) == 0:
            return Response({"detail": "No valid plans found for the user"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            state = request.query_params.get("state")
            district = request.query_params.get("district")
            taluka = request.query_params.get("taluka")
            village = request.query_params.get("village")
            survey_no = request.query_params.get("survey_no")

        except ValueError:
            return Response({"detail": "Invalid query params"}, status=status.HTTP_400_BAD_REQUEST)
        
        if talukas not in talukas:
            if district not in districts:
                if village not in villages:
                    return Response({"detail": "Invalid query params"}, status=status.HTTP_400_BAD_REQUEST)
                
        
        all_manager_obj = all_manager()

        pdf = all_manager_obj.get_plot_pdf(state, district, taluka, village, survey_no)
        return Response(pdf, status=status.HTTP_200_OK)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def report_gen3(request):
    """Generates report for a single entity with access validation and transaction tracking"""
    if request.method == "GET":
        user = request.user
        plans = user.plans.all()

        # Initialize access lists
        states = set()
        districts = set()
        talukas = set()
        villages = set()

        state.add("maharashtra")
        # Populate access lists based on user plans
        for p in plans:
            if p.is_valid:
                if p.plan_type == "State":
                    states.add(p.entity_name)

                elif p.plan_type == "District":
                    districts.add(p.entity_name)
                    metadata_objects = MaharashtraMetadata.objects.filter(
                        district_name=p.entity_name
                    )
                    for obj in metadata_objects:
                        talukas.add(obj.taluka_name)
                        villages.add(obj.village_name)

                elif p.plan_type == "Taluka":
                    talukas.add(p.entity_name)
                    metadata_objects = MaharashtraMetadata.objects.filter(
                        taluka_name=p.entity_name
                    )
                    for obj in metadata_objects:
                        villages.add(obj.village_name)

                elif p.plan_type == "Village":
                    villages.add(p.entity_name)

        # If no valid plans, return error
        if not plans:
            return Response(
                {"detail": "No valid plans found for the user"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Get query parameters
        state = request.query_params.get("state")
        district = request.query_params.get("district")
        taluka = request.query_params.get("taluka")
        village = request.query_params.get("village")
        survey_no = request.query_params.get("survey_no")

        # Validate access based on hierarchy
        if state and state not in states:
            return Response(
                {"detail": "User does not have access to the specified state"},
                status=status.HTTP_403_FORBIDDEN,
            )

        if district and district not in districts:
            return Response(
                {"detail": "User does not have access to the specified district"},
                status=status.HTTP_403_FORBIDDEN,
            )

        if taluka and taluka not in talukas:
            return Response(
                {"detail": "User does not have access to the specified taluka"},
                status=status.HTTP_403_FORBIDDEN,
            )

        if village and village not in villages:
            return Response(
                {"detail": "User does not have access to the specified village"},
                status=status.HTTP_403_FORBIDDEN,
            )

        # Transaction tracking and allowed transaction reduction
        with transaction.atomic():
            # Find the relevant plan for the query
            relevant_plan = None
            for p in plans:
                if (
                    (village and p.plan_type == "Village" and p.entity_name == village)
                    or (taluka and p.plan_type == "Taluka" and p.entity_name == taluka)
                    or (
                        district
                        and p.plan_type == "District"
                        and p.entity_name == district
                    )
                ):
                    relevant_plan = p
                    break

            if not relevant_plan:
                return Response(
                    {"detail": "No matching plan found for the query"},
                    status=status.HTTP_403_FORBIDDEN,
                )

            # Reduce allowed transactions and create a transaction entry
            if (
                relevant_plan.total_transactions
                >= ALLOWED_TRANSACTIONS[relevant_plan.plan_type]
            ):
                return Response(
                    {"detail": "Transaction limit exceeded for the plan"},
                    status=status.HTTP_403_FORBIDDEN,
                )

            # Create a transaction
            Transaction.objects.create(
                plan=relevant_plan,
                details={
                    "state": state,
                    "district": district,
                    "taluka": taluka,
                    "village": village,
                    "survey_no": survey_no,
                },
            )

        # Generate PDF report using the validated parameters
        all_manager_obj = all_manager()
        pdf = all_manager_obj.get_plot_pdf(state, district, taluka, village, survey_no)
        return HttpResponse(pdf, status=status.HTTP_200_OK)



@api_view(["GET"])
@permission_classes([IsAuthenticated])
def validate_fetch(request):
    """Validates the user access to the pg_tileserve data and serves the data by fetching from the database"""

    user = request.user
    plans = user.plans.filter(is_valid=True)
    state = request.query_params.get("state") 
    district = request.query_params.get("district")
    taluka = request.query_params.get("taluka")
    village = request.query_params.get("village")
    if not plans:
        return Response(
            {"detail": "No valid plans found for the user"},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if not state or not district or not taluka or not village:
        return Response(
            {"detail": "Invalid query params"},
            status=status.HTTP_400_BAD_REQUEST,
        )
    raise NotImplementedError("This endpoint is not implemented yet.")

    
@api_view(["GET"])
def get_metadata(request):
    """Get all metadata in district -> taluka -> village format"""
    
    # Fetch metadata
    metadata = MaharashtraMetadata.objects.all().values("district_name", "taluka_name", "village_name")
    
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