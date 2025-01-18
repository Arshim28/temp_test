from rest_framework import status
from rest_framework.generics import RetrieveUpdateAPIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import api_view

from .renderers import UserJSONRenderer
from .serializers import RegistrationSerializer, LoginSerializer, UserSerializer
import logging


logger = logging.getLogger(__name__)


class RegistrationAPIView(APIView):
    # Allow any user (authenticated or not) to hit this endpoint.
    permission_classes = (AllowAny,)
    serializer_class = RegistrationSerializer
    renderer_classes = (UserJSONRenderer,)

    def post(self, request):
        user = request.data.get("user", {})

        serializer = self.serializer_class(data=user)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(serializer.data, status=status.HTTP_201_CREATED)


class LoginAPIView(APIView):
    permission_classes = (AllowAny,)
    serializer_class = LoginSerializer

    def post(self, request):
        user = request.data.get("user", {})

        print("HERE")

        serializer = self.serializer_class(data=user)
        logger.debug(f"Serialized Data: {serializer.initial_data}")
        if serializer.is_valid():
            response = serializer.data
            return Response(response, status=status.HTTP_200_OK)
        else:
            print(serializer.errors)

        return Response(serializer.data, status=status.HTTP_200_OK)


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
            "username": user_data.get("username", request.user.username),
            "email": user_data.get("email", request.user.email),
        }

        # TODO: Add order details here

        serializer = self.serializer_class(
            request.user, data=serializer_data, partial=True
        )


@api_view(["GET"])
def account_details(request):
    if request.method == "GET":
        user = request.user

        plans = user.plans.all()
        print(plans)

        return Response(status=status.HTTP_200_OK)
