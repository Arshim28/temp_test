from rest_framework.generics import CreateAPIView, ListAPIView, RetrieveAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from rest_framework.exceptions import ValidationError
from .serializers import PlanSerializer, TransactionSerializer, MaharashtraMetadataSerializer
from .models import Plan, Transaction, ALLOWED_TRANSACTIONS, MaharashtraMetadata    
from django.http import HttpResponse
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


