from django.urls import path

from .views import (
    start_payment,
    handle_payment_success,
    get_fixed_plan_details,
    get_fixed_mv_plans,
    get_fixed_report_plans,
    buy_free_report_plan,
)

urlpatterns = [
    path("plans/create-order/", start_payment, name="payment"),
    path("plans/payment/success/", handle_payment_success, name="payment_success"),
    path("plans/check-cost/", get_fixed_plan_details, name="fixed_plans_details"),
    path("plans/reports/", get_fixed_report_plans, name="fixed_report_plans"),
    path("plans/map-view/", get_fixed_mv_plans, name="fixed_mv_plans"),
    path("plans/free-report/", buy_free_report_plan, name="free_report_plan"),
]
