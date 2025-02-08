import json
import razorpay
from django.conf import settings
from django.shortcuts import get_object_or_404
from django.db import transaction
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny

from utils.models import Plan, ReportPlan
from .models import MVPlanOrder, ReportPlanOrder, FixedReportPlans, FixedMVPlans
from .serializers import (
    MVPlanOrderSerializer,
    ReportPlanOrderSerializer,
    FixedMVPlansSerializer,
    FixedReportPlansSerializer
)


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def start_payment(request):
    """
    Creates an order in Razorpay and stores it in the database as PENDING.
    """
    amount = request.data.get("amount")
    name = request.data.get("name")
    order_type = request.data.get("order_type")  # 'mapview' or 'report'

    if not amount or not name or not order_type:
        return Response({"error": "Missing required parameters"}, status=400)

    client = razorpay.Client(auth=(settings.RAZORPAY_PUBLIC_KEY, settings.RAZORPAY_SECRET_KEY))

    # Create Razorpay order (Amount should be in paise)
    payment = client.order.create(
        {"amount": int(amount) * 100, "currency": "INR", "payment_capture": "1"}
    )

    # Choose the correct order model
    order = None
    if order_type == "mapview":
        order = MVPlanOrder.objects.create(
            user=request.user,
            order_product=name,
            order_amount=amount,
            order_payment_id=payment["id"],
            status="PENDING",
        )
        serializer = MVPlanOrderSerializer(order)
    elif order_type == "report":
        order = ReportPlanOrder.objects.create(
            user=request.user,
            order_product=name,
            order_amount=amount,
            order_payment_id=payment["id"],
            status="PENDING",
        )
        serializer = ReportPlanOrderSerializer(order)
    else:
        return Response({"error": "Invalid order type"}, status=400)

    return Response({"payment": payment, "order": serializer.data})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def handle_payment_success(request):
    """
    Verifies the payment with Razorpay, updates order status, and creates a plan.
    """
    try:
        res = json.loads(request.data["response"])
    except json.JSONDecodeError:
        return Response({"error": "Invalid JSON data"}, status=400)

    ord_id = res.get("razorpay_order_id")
    raz_pay_id = res.get("razorpay_payment_id")
    raz_signature = res.get("razorpay_signature")

    if not ord_id or not raz_pay_id or not raz_signature:
        return Response({"error": "Missing payment details"}, status=400)

    client = razorpay.Client(auth=(settings.RAZORPAY_PUBLIC_KEY, settings.RAZORPAY_SECRET_KEY))

    data = {
        "razorpay_order_id": ord_id,
        "razorpay_payment_id": raz_pay_id,
        "razorpay_signature": raz_signature,
    }

    try:
        client.utility.verify_payment_signature(data)
    except razorpay.errors.SignatureVerificationError:
        return Response({"error": "Invalid payment signature"}, status=400)

    # Fetch order dynamically (either MVPlanOrder or ReportPlanOrder)
    order = get_object_or_404(
        MVPlanOrder.objects.filter(order_payment_id=ord_id) |
        ReportPlanOrder.objects.filter(order_payment_id=ord_id)
    )

    if order.status == "COMPLETED":
        return Response({"message": "Payment already verified"}, status=200)

    with transaction.atomic():
        order.status = "COMPLETED"
        order.save()

        # Create a plan based on order type
        if isinstance(order, MVPlanOrder):
            Plan.objects.create(
                user=order.user,
                plan_type="MapView",
                entity_name=order.order_product,
                duration=12,  # Default duration (modify as needed)
                is_paid=True,
            )
        elif isinstance(order, ReportPlanOrder):
            ReportPlan.objects.create(
                user=order.user,
                quantity=10,  # Default quantity (modify as needed)
                duration=12,
                is_paid=True,
            )

    return Response({"message": "Payment successfully received!"}, status=200)



@api_view(["GET"])
@permission_classes([AllowAny])
def get_fixed_plan_details(request):
    """
    Retrieve details of a Fixed Map-View Plan based on entity_type and entity_name.
    """
    print(request.query_params)
    plan_type = request.query_params.get("plan_type")
    if plan_type == "mapview":
        entity_type = request.query_params.get("entity_type").strip()
        entity_name = request.query_params.get("entity_name").strip()

        print(entity_type, entity_name)

        if not entity_type or not entity_name:
            return Response({"error": "Missing required parameters"}, status=400)

        # plan = get_object_or_404(FixedMVPlans, entity_type=entity_type, entity_name=entity_name)
        plan = FixedMVPlans.objects.get(entity_type=entity_type, entity_name=entity_name)
        serializer = FixedMVPlansSerializer(plan)

        return Response(serializer.data, status=200)
    elif plan_type == "report":
        quantity = int(request.query_params.get("quantity"))
        if not quantity:
            return Response({"error": "Missing required parameters"}, status=400)
        plan = get_object_or_404(FixedReportPlans, quantity=quantity)
        serializer = FixedReportPlansSerializer(plan)
    else:
        return Response({"error": "Invalid plan type"}, status=400)
