from rest_framework.generics import CreateAPIView, ListAPIView, RetrieveAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from rest_framework.exceptions import ValidationError
from .serializers import PlanSerializer, TransactionSerializer, MaharashtraMetadataSerializer
from .models import Plan, Transaction, ALLOWED_TRANSACTIONS, MaharashtraMetadata    
from django.http import HttpResponse, JsonResponse
from django.views import View
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
        # Automatically associate the order with the authenticated user
        serializer.save(user=self.request.user)


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

class KhataNumbersView(View):
    def get(self, request):
        district = request.GET.get('district')
        taluka_name = request.GET.get('taluka_name')
        village_name = request.GET.get('village_name')

        if not all([district, taluka_name, village_name]):
            return JsonResponse({'error': 'Missing required parameters: district, taluka_name, village_name'}, status=400)

        try:
            all_manager_obj = all_manager()
            data_manager = all_manager_obj.textual_data_manager()

            khata_numbers = data_manager.get_khata_from_village(district, taluka_name, village_name)
            return JsonResponse({'khata_numbers': khata_numbers})
        except Exception as e:

            return JsonResponse({'error': str(e)}, status=500)

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
    survey_no = survey_no

    all_manager_obj = all_manager()
    pdf = all_manager_obj.get_plot_pdf_by_khata(state, district, taluka, village, survey_no)
    print(pdf)


    return HttpResponse(pdf, status=status.HTTP_200_OK)


@api_view(["GET"])
def report_gen2(request):
    """Generates report for a single entity"""
    if request.method == "GET":
        user = request.user
        plans = user.plans.all()
        tallukas = []
        villages = []
        districts = []
        for p in plans:
            if p.is_valid:
                if p.plan_type == "Talluka":
                    tallukas.append(p.entity)
                elif p.plan_type == "Village":
                    villages.append(p.entity)
                elif p.plan_type == "District":
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
        
        if tallukas not in tallukas:
            if district not in districts:
                if village not in villages:
                    return Response({"detail": "Invalid query params"}, status=status.HTTP_400_BAD_REQUEST)
                
        
        all_manager_obj = all_manager()

        pdf = all_manager_obj.get_plot_pdf(state, district, taluka, village, survey_no)
        return Response(pdf, status=status.HTTP_200_OK)


