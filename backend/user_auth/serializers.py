from rest_framework import serializers
from django.contrib.auth import authenticate
from user_auth.models import CustomUser


class RegistrationSerializer(serializers.ModelSerializer):
    """Serializers registration requests and creates a new user."""

    password = serializers.CharField(max_length=128, min_length=8, write_only=True)

    token = serializers.CharField(max_length=255, read_only=True)

    class Meta:
        model = CustomUser
        fields = ["email", "name", "password", "phone_number", "token"]

    def create(self, validated_data):
        return CustomUser.objects.create_user(**validated_data)


class CustomUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomUser
        fields = ["_all_"]


class LoginSerializer(serializers.Serializer):
    email = serializers.CharField(max_length=255)
    username = serializers.CharField(max_length=255, read_only=True)
    password = serializers.CharField(max_length=128, write_only=True)
    token = serializers.CharField(max_length=255, read_only=True)
    id = serializers.UUIDField(read_only=True)

    class Meta:
        model = CustomUser
        fields = ["email", "name", "password", "token"]

    def validate(self, data):

        email = data.get("email", None)
        password = data.get("password", None)

        id = str(data.get("id", None))

        if email is None:
            raise serializers.ValidationError("An email address is required to log in.")

        if password is None:
            raise serializers.ValidationError("A password is required to log in.")

        user = authenticate(email=email, password=password)
        print(password, email, user)

        if user is None:
            raise serializers.ValidationError(
                "A user with this email and password was not found."
            )

        if not user.is_active:
            raise serializers.ValidationError("This user has been deactivated.")

        return {"email": user.email, "token": user.token, "id": str(user.id)}


class UserSerializer(serializers.ModelSerializer):
    """Handles serialization and deserialization of User objects."""

    password = serializers.CharField(max_length=128, min_length=8, write_only=True)

    bio = serializers.CharField(source="profile.bio", read_only=True)

    class Meta:
        model = CustomUser
        fields = (
            "email",
            "username",
            "password",
            "token",
            "profile",
            "bio",
            "image",
        )

    def update(self, instance, validated_data):
        """Performs an update on a User."""

        password = validated_data.pop("password", None)

        for key, value in validated_data.items():

            setattr(instance, key, value)

        if password is not None:
            instance.set_password(password)

        instance.save()

        return instance
