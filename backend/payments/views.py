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
    FixedReportPlansSerializer,
)


ORDER_TYPE_MAP = {
    "mapview": FixedMVPlans,
    "report": FixedReportPlans,
}

ORDER_MODEL_MAP = {
    "mapview": (MVPlanOrder, MVPlanOrderSerializer),
    "report": (ReportPlanOrder, ReportPlanOrderSerializer),
}

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def start_payment(request):
    """
    Creates an order in Razorpay and stores it in the database as PENDING.
    """
    required_fields = ["amount", "name", "order_type", "fixed_order"]
    if not all(request.data.get(field) for field in required_fields):
        return Response({"error": "Missing required parameters"}, status=400)

    try:
        amount = float(request.data["amount"])
    except ValueError:
        return Response({"error": "Invalid amount format"}, status=400)

    name = request.data["name"]
    order_type = request.data["order_type"]
    fixed_order_id = request.data["fixed_order"]

    ModelClass = ORDER_TYPE_MAP.get(order_type)
    if not ModelClass:
        return Response({"error": "Invalid order type"}, status=400)

    fixed_order = get_object_or_404(ModelClass, id=fixed_order_id)

    if fixed_order.price != amount:
        return Response({"error": "Invalid amount for the selected plan"}, status=400)

    client = razorpay.Client(auth=(settings.RAZORPAY_PUBLIC_KEY, settings.RAZORPAY_SECRET_KEY))

    currency = getattr(settings, "PAYMENT_CURRENCY", "INR")
    payment = client.order.create(
        {"amount": amount * 100, "currency": currency, "payment_capture": "1"}
    )
    print("[INFO]: Payment: Order created for amount: ", amount)
    print("[INFO]: Payment: ", payment)

    OrderModel, SerializerClass = ORDER_MODEL_MAP.get(order_type, (None, None))
    if not OrderModel:
        return Response({"error": "Invalid order type"}, status=400)

    order = OrderModel.objects.create(
        user=request.user,
        order_product=name,
        order_amount=amount,
        order_payment_id=payment["id"],
        status="PENDING",
        fixed_plan=fixed_order,
    )

    serializer = SerializerClass(order)
    print ("[INFO]: SD: ", serializer.data)
    return Response({"payment": payment, "order": serializer.data})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def handle_payment_success(request):
    """
    Verifies the payment with Razorpay, updates order status, and creates a corresponding plan.
    """
    try:
        res = json.loads(request.data.get("response", "{}"))
    except json.JSONDecodeError:
        return Response({"error": "Invalid JSON data"}, status=400)

    ord_id = res.get("razorpay_order_id")
    raz_pay_id = res.get("razorpay_payment_id")
    raz_signature = res.get("razorpay_signature")

    if not all([ord_id, raz_pay_id, raz_signature]):
        return Response({"error": "Missing payment details"}, status=400)

    client = razorpay.Client(auth=(settings.RAZORPAY_PUBLIC_KEY, settings.RAZORPAY_SECRET_KEY))

    try:
        client.utility.verify_payment_signature({
            "razorpay_order_id": ord_id,
            "razorpay_payment_id": raz_pay_id,
            "razorpay_signature": raz_signature,
        })
    except razorpay.errors.SignatureVerificationError:
        return Response({"error": "Invalid payment signature"}, status=400)

    # Retrieve order dynamically
    order = MVPlanOrder.objects.filter(order_payment_id=ord_id).first() or ReportPlanOrder.objects.filter(order_payment_id=ord_id).first()

    if not order:
            return Response({"error": "Order not found"}, status=404)


    if order.status == "COMPLETED":
        return Response({"message": "Payment already verified"}, status=200)

    with transaction.atomic():
        order.status = "COMPLETED"
        order.save()

        # Create a plan based on order type
        if isinstance(order, MVPlanOrder):
            fixed_plan_id = order.fixed_plan.id
            mv_f = FixedMVPlans.objects.get(id=fixed_plan_id)
            entity_type = mv_f.entity_type
            entity_name = mv_f.entity_name
            Plan.objects.create(
                user=order.user,
                plan_type=entity_type,
                entity_name=entity_type,
                duration=12, # TODO: Add duration to FixedMVPlans
                is_paid=True,
            )
        elif isinstance(order, ReportPlanOrder):
            fixed_plan_id = order.fixed_plan.id
            report_f = FixedReportPlans.objects.get(id=fixed_plan_id)
            quantity = report_f.quantity
            ReportPlan.objects.create(
                user=order.user,
                quantity=quantity,
                duration=12, # TODO: Add duration to FixedReportPlans
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
        plan = FixedMVPlans.objects.get(
            entity_type=entity_type, entity_name=entity_name
        )
        serializer = FixedMVPlansSerializer(plan)

        return Response(serializer.data, status=200)
    elif plan_type == "report":
        quantity = int(request.query_params.get("quantity"))
        if not quantity:
            return Response({"error": "Missing required parameters"}, status=400)
        plan = get_object_or_404(FixedReportPlans, quantity=quantity)
        serializer = FixedReportPlansSerializer(plan)

        return Response(serializer.data, status=200)
    else:
        return Response({"error": "Invalid plan type"}, status=400)
