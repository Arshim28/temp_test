from django.urls import path
from scipy.sparse.linalg._eigen import test
from .views import (
    create_plan,
    create_report_plan,
    ListPlansView,
    ListReportPlansView,
    RetrievePlanView,
    RetrieveReportPlanView,
    ListTransactionsView,
    RetrieveTransactionView,
    get_tile_url,
    report_gen,
    report_gen3,
    MaharashtraMetadataList,
    maharashtra_hierarchy,
    KhataNumbersView,
    get_plot_by_lat_lng,
    get_khata_preview,
    get_available_reports,
    report_info_from_khata,
    search_report_by_survey,
    search_report_by_gat,
    health_check,
    get_khata_from_survey_view,
    # get_access_token
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
        "transactions<uuid:pk>/",
        RetrieveTransactionView.as_view(),
        name="retrieve-transaction",
    ),
    path("report-gen2/", report_gen, name="report-gen"),
    path("report-gen/", report_gen3, name="report_gen2"),
    path(
        "maharashtra_metadata/",
        MaharashtraMetadataList.as_view(),
        name="maharashtra_metadata_list",
    ),
    path("maharashtra-hierarchy/", maharashtra_hierarchy, name="maharashtra_hierarchy"),
    path("khata-numbers/", KhataNumbersView.as_view(), name="khata_numbers"),
    path("plot/", get_plot_by_lat_lng, name="get_plot_by_lat_lng"),
    path("get_tile_url/", get_tile_url, name="proxy_access_token"),
    path("khata-preview/", get_khata_preview, name="khata_preview"),  # get plot id
    path("reports-info/", get_available_reports, name="get_available_reports"),
    path("reports/search/gat/", search_report_by_gat, name="search_report_by_gat"),
    path("reports/search/survey/", search_report_by_survey, name="search_reports"),
    path("khata/report-info/", report_info_from_khata, name="report-info-from-khata"),
    path("khata-from-survey/", get_khata_from_survey_view, name="get-khata-from-survey"),
    path("health-check/", health_check, name="health-check"),
]
