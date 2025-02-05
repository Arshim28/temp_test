from django.urls import path
from .views import (
    create_plan,
    create_report_plan,
    ListPlansView,
    ListReportPlansView,
    RetrievePlanView,
    RetrieveReportPlanView,
    CreateTransactionView,
    ListTransactionsView,
    RetrieveTransactionView,
    report_gen,
    report_gen3,
    MaharashtraMetadataList,
    maharashtra_hierarchy,
    KhataNumbersView,
    get_plot_by_lat_lng
)

urlpatterns = [
    path("plans/", ListPlansView.as_view(), name="list-plans"),

    path("plans/create/", create_plan, name="create-plan"),
    path("report-plans/create/", create_report_plan, name="create-report-plan"),

    path(
        "plans/<uuid:pk>/", RetrievePlanView.as_view(), name="retrieve-plan"
    ),  # TODO:Add endpoint to access all transactions for a plan
    path(
        "report-plans/<uuid:pk>/",
        RetrieveReportPlanView.as_view(),
        name="retrieve-report-plan",
    ),
    path("report-plans/", ListReportPlansView.as_view(), name="list-report-plans"),
    path("transactions/", ListTransactionsView.as_view(), name="list-transactions"),
    path(
        "transactions/create/",
        CreateTransactionView.as_view(),
        name="create-transaction",
    ),
    path(
        "transactions<uuid:pk>/",
        RetrieveTransactionView.as_view(),
        name="retrieve-transaction",
    ),
    path(
        "report-gen/", report_gen, name="report-gen"
    ),
    path("report_gen2/", report_gen3, name="report_gen2"),
    path(
        'maharashtra_metadata/', MaharashtraMetadataList.as_view(), name='maharashtra_metadata_list'
    ),
    path('maharashtra-hierarchy/', maharashtra_hierarchy, name='maharashtra_hierarchy'),
    path('khata-numbers/', KhataNumbersView.as_view(), name='khata_numbers'),
    path('plot/', get_plot_by_lat_lng, name='get_plot_by_lat_lng')

]
