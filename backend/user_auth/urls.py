from django.urls import path

from .views import (
    LoginAPIView,
    RegistrationAPIView,
    ForgotPassword,
    UserRetrieveUpdateAPIView,
    account_details,
    VerifyOTPView,
    RequestOTPView,
)

urlpatterns = [
    path("user/", UserRetrieveUpdateAPIView.as_view(), name="user-detail"),
    path("users/", RegistrationAPIView.as_view(), name="user-registration"),
    path("users/login/", LoginAPIView.as_view(), name="user-login"),
    path("users/forgot-password/", ForgotPassword.as_view(), name="forgot-password"),
    path("user/account/", account_details, name="account-details"),
    path("otp/request/", RequestOTPView.as_view(), name="request-otp"),
    path("otp/verify/", VerifyOTPView.as_view(), name="verify-otp"),
]
