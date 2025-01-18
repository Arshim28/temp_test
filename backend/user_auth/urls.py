from django.urls import path
from django.contrib.auth.decorators import login_required

from .views import (
    LoginAPIView,
    RegistrationAPIView,
    UserRetrieveUpdateAPIView,
    account_details,
)

urlpatterns = [
    path("user/", UserRetrieveUpdateAPIView.as_view(), name="user-detail"),
    path("users/", RegistrationAPIView.as_view(), name="user-registration"),
    path("users/login/", LoginAPIView.as_view(), name="user-login"),
    path("account/", account_details, name="account-details"),
]
