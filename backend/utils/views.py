from rest_framework.generics import CreateAPIView, ListAPIView, RetrieveAPIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from .serializers import PlanSerializer, TransactionSerializer
from .models import Plan, Transaction, ALLOWED_TRANSACTIONS


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


@api_view(["GET"])
def report_gen(request):
    user = request.user
