from django.urls import path
from .views import (
    CreatePlanView,
    ListPlansView,
    RetrievePlanView,
    CreateTransactionView,
    ListTransactionsView,
    RetrieveTransactionView,
    report_gen,
    report_gen2,
    MaharashtraMetadataList
)

urlpatterns = [
    path("plans/", ListPlansView.as_view(), name="list-plans"),
    path("plans/create/", CreatePlanView.as_view(), name="create-plan"),
    path(
        "plans/<uuid:pk>/", RetrievePlanView.as_view(), name="retrieve-plan"
    ),  # TODO:Add endpoint to access all transactions for a plan
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
    path("report_gen/", report_gen2, name="report_gen"),
    path(
        'maharashtra_metadata/', MaharashtraMetadataList.as_view(), name='maharashtra_metadata_list'
    ),

]
