import jwt
from django.conf import settings
from rest_framework import authentication, exceptions
from .models import CustomUser


class JWTAuthentication(authentication.BaseAuthentication):
    authentication_header_prefix = "Bearer"

    def authenticate(self, request):
        """
        Authenticate the user based on the JWT token in the authorization header.
        """
        request.user = None

        # Extract the Authorization header
        auth_header = authentication.get_authorization_header(request).split()
        auth_header_prefix = self.authentication_header_prefix.lower()

        if not auth_header:
            return None

        if len(auth_header) == 1 or len(auth_header) > 2:
            # Invalid token header
            return None

        prefix = auth_header[0].decode("utf-8")
        token = auth_header[1].decode("utf-8")

        if prefix.lower() != auth_header_prefix:
            return None

        # Validate and authenticate the token
        return self._authenticate_credentials(request, token)

    def _authenticate_credentials(self, request, token):
        """
        Authenticate the provided credentials, return user and token if valid.
        """
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        except jwt.ExpiredSignatureError:
            raise exceptions.AuthenticationFailed("The token has expired.")
        except jwt.InvalidTokenError:
            raise exceptions.AuthenticationFailed(
                "Invalid authentication. Could not decode token."
            )

        try:
            user = CustomUser.objects.get(pk=payload["id"])
        except CustomUser.DoesNotExist:
            raise exceptions.AuthenticationFailed(
                "No user matching this token was found."
            )

        if not user.is_active:
            raise exceptions.AuthenticationFailed("This user has been deactivated.")

        return (user, token)
