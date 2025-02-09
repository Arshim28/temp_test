from django.urls import path

from .views import start_payment, handle_payment_success, get_fixed_plan_details

urlpatterns = [
    path("plans/create-order/", start_payment, name="payment"),
    path("plans/payment/success/", handle_payment_success, name="payment_success"),
    path("plans/check-cost/", get_fixed_plan_details, name="fixed_plans_details"),
]
