import uuid
import logging

from django.utils.timezone import now
from django.utils import timezone
from django.db import transaction

from rest_framework import status
from rest_framework.throttling import AnonRateThrottle
from rest_framework.generics import RetrieveUpdateAPIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response, Serializer
from rest_framework.views import APIView
from rest_framework.decorators import api_view, permission_classes

from .renderers import UserJSONRenderer
from .models import CustomUser, OTPVerification, UserProfile
from .serializers import (
    RegistrationSerializer,
    LoginSerializer,
    UserSerializer,
    ProfileSerializer,
)
from .helpers import send_otp, generate_otp

from utils.serializers import PlanSerializer, TransactionSerializer

# pyright: reportAttributeAccessIssue=false
logger = logging.getLogger(__name__)


class RegistrationAPIView(APIView):
    permission_classes = (AllowAny,)
    serializer_class = RegistrationSerializer
    renderer_classes = (UserJSONRenderer,)

    def post(self, request):

        user_data = request.data.get("user", {})
        email = user_data.get("email")
        verification_token = user_data.get("verification_token")

        if not email or not verification_token:
            return Response(
                {"error": "Email and verification token are required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Clean up expired verification tokens
        OTPVerification.objects.filter(email=email, token_expires_at__lt=now()).delete()

        try:
            otp_entry = OTPVerification.objects.get(
                email=email, is_verified=True, verification_token=verification_token
            )

            with transaction.atomic():  # Ensures all DB operations succeed together
                # Proceed with user registration
                serializer = self.serializer_class(data=user_data)
                serializer.is_valid(raise_exception=True)
                serializer.save()

                profile_data = user_data["profile"]
                profile_data["user"] = CustomUser.objects.get(email=email).id


                profile_serializer = ProfileSerializer(data=profile_data)

                profile_serializer.is_valid(raise_exception=True)
                profile_serializer.save()

                # Delete OTP entry after successful registration
                OTPVerification.objects.filter(email=email).delete()

                return Response(serializer.data, status=status.HTTP_201_CREATED)

        except OTPVerification.DoesNotExist:
            return Response(
                {"error": "Invalid OTP verification."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except Exception as e:
            print("[INFO]: error in registration: ", str(e))
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        except OTPVerification.DoesNotExist:
            return Response(
                {"error": "Invalid or expired verification token"},
                status=status.HTTP_400_BAD_REQUEST,
            )


class ForgotPassword(APIView):
    permission_classes = (AllowAny,)
    serializer_class = UserSerializer

    def post(self, request):
        user_data = request.data
        email = user_data.get("email")
        password = user_data.get("password")
        verification_token = user_data.get("verification_token")

        OTPVerification.objects.filter(email=email, token_expires_at__lt=now()).delete()

        if not CustomUser.objects.filter(email=email).exists():
            return Response(
                {"error": "User not found"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            otp_entry = OTPVerification.objects.get(
                email=email, verification_token=verification_token, is_verified=True
            )
            user = CustomUser.objects.get(email=email)
            user.set_password(password)
            user.save()
            otp_entry.delete()
            return Response(
                {"message": "Password reset successful"},
                status=status.HTTP_200_OK,
            )

        except OTPVerification.DoesNotExist:
            return Response(
                {"error": "Invalid or expired verification token"},
                status=status.HTTP_400_BAD_REQUEST,
            )


class LoginAPIView(APIView):
    permission_classes = (AllowAny,)
    serializer_class = LoginSerializer

    def post(self, request):
        user = request.data.get("user", {})


        serializer = self.serializer_class(data=user)
        logger.debug(f"Serialized Data: {serializer.initial_data}")
        if serializer.is_valid():
            user_data = serializer.data
            user_id = user_data["id"]
            print(user_data)
            user_profile = UserProfile.objects.get(user=user_id)
            profile_serializer = ProfileSerializer(user_profile)
            response = {**user_data, **profile_serializer.data}
            return Response(response, status=status.HTTP_200_OK)

        logger.error(serializer.errors)
        return Response(serializer.errors, status=status.HTTP_403_FORBIDDEN)


class UserRetrieveUpdateAPIView(RetrieveUpdateAPIView):
    permission_classes = (IsAuthenticated,)
    renderer_classes = (UserJSONRenderer,)
    serializer_class = UserSerializer

    def retrieve(self, request, *args, **kwargs):

        serializer = self.serializer_class(request.user)

        return Response(serializer.data, status=status.HTTP_200_OK)

    def update(self, request, *args, **kwargs):
        user_data = request.data.get("user", {})

        serializer_data = {
            "name": user_data.get("name", request.user.name),
            "email": user_data.get("email", request.user.email),
        }

        # TODO: Add order details here

        serializer = self.serializer_class(
            request.user, data=serializer_data, partial=True
        )


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def account_details(request):
    if request.method == "GET":
        user = request.user

        plans = user.plans.all()
        transactions = user.transactions.all()
        plan_serializer = PlanSerializer(plans, many=True)
        transaction_serializer = TransactionSerializer(transactions, many=True)
        data = {
            "user": user.name,
            "email": user.email,
            "plans": plan_serializer.data,
            "transactions": transaction_serializer.data,
        }

        return Response(status=status.HTTP_200_OK)


class RequestOTPView(APIView):
    throttle_classes = [AnonRateThrottle]  # Basic rate limiting

    def post(self, request):
        email = request.data.get("email")

        if not email:
            return Response(
                {"error": "Email is required"}, status=status.HTTP_400_BAD_REQUEST
            )
        # Delete expired OTPs
        OTPVerification.cleanup_expired(email)
        # Generate OTP
        otp = generate_otp()
        expiry_time = now() + timezone.timedelta(minutes=5)  # OTP valid for 5 mins

        # Remove old OTPs for the same email before creating a new one
        OTPVerification.objects.filter(email=email).delete()
        # Create new OTP entry
        otp_obj = OTPVerification.objects.create(
            email=email, otp=otp, expires_at=expiry_time
        )
        otp_sent = send_otp(email, otp)
        if not otp_sent:
            otp_obj.delete()
            return Response(
                {"error": "Failed to send OTP"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        return Response({"message": "OTP sent!"}, status=status.HTTP_200_OK)


class VerifyOTPView(APIView):
    def post(self, request):
        email = request.data.get("email")
        otp = request.data.get("otp")

        # Clean up expired OTPs
        OTPVerification.cleanup_expired(email)

        try:
            # NOTE: Room for improvement here!
            otp_entry = OTPVerification.objects.filter(
                email=email, is_verified=False
            ).latest("expires_at")
            # Get latest valid OTP

            if not otp_entry.is_valid() or otp_entry.otp != otp:
                return Response(
                    {"error": "Invalid or expired OTP"},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            # Generate a one-time verification token
            verification_token = uuid.uuid4()
            token_expiry = now() + timezone.timedelta(minutes=10)

            otp_entry.is_verified = True
            otp_entry.verification_token = verification_token
            otp_entry.token_expires_at = token_expiry
            otp_entry.save()

            return Response(
                {
                    "message": "OTP verified!",
                    "verification_token": str(verification_token),
                },
                status=status.HTTP_200_OK,
            )

        except OTPVerification.DoesNotExist:
            return Response(
                {"error": "No valid OTP found"}, status=status.HTTP_400_BAD_REQUEST
            )
