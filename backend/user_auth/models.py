import jwt
import uuid

from datetime import datetime, timedelta
from django.utils.timezone import now
from django.db import models
from django.contrib.auth.models import (
    AbstractBaseUser,
    BaseUserManager,
    PermissionsMixin,
)
from django.conf import settings


class CustomUserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("The email  field must be set")

        email = self.normalize_email(email)
        phone_number = None
        if "phone_number" in extra_fields:
            try:
                phone_number = int(extra_fields.pop("phone_number"))
            except ValueError:
                extra_fields.pop("phone_number")
        name = email

        if "name" in extra_fields:
            name = extra_fields.pop("name")

        user = self.model(email=email, name=name, **extra_fields)

        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, name, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("name", name)
        return self.create_user(email, password, **extra_fields)


class CustomUser(AbstractBaseUser, PermissionsMixin):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    name = models.CharField(max_length=255, blank=True, null=True)
    email = models.EmailField(db_index=True, unique=True)
    phone_number = models.BigIntegerField(null=True, blank=True)


    ## User Permissions
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    objects = CustomUserManager()
    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["name"]

    def __str__(self):
        return self.name + "--" + str(self.email)

    def save(self, *args, **kwargs):
        if not self.name:
            self.name = self.email
        super(CustomUser, self).save(*args, **kwargs)

    @property
    def token(self):
        """
        Allows us to get a user's token by calling `user.token` instead of
        `user.generate_jwt_token().


        """
        return self._generate_jwt_token()

    @property
    def access_level(self) -> str:
        """The  access_level."""
        return self._get_access_level()

    def _get_access_level(self):

        if not self.is_active:
            return "Inactive"

        if self.is_superuser:
            return "Admin"

        user_plans = self.plans.all()

        access_level = None

        for plan in user_plans:
            if plan.plan_type == "Village" and access_level is None:
                access_level = "Village"
            elif plan.plan_type == "District":
                access_level = "District"
                break
            elif plan.plan_type == "Taluka" and access_level != "District":
                access_level = "Taluka"

        return access_level

    def _generate_jwt_token(self):
        """
        Generates a JSON Web Token that stores this user's ID and has an expiry
        date set to 60 days into the future.
        """
        dt = datetime.now() + timedelta(days=60)

        token = jwt.encode(
            {"id": str(self.pk), "exp": int(dt.strftime("%s"))},
            settings.SECRET_KEY,
            algorithm="HS256",
        )

        return token

    @property
    def plan_details(self):
        """The  property."""
        return self._plan_details()

    def _plan_details(self):
        plans = self.plans.all()

        data = {
            "Village": [],
            "Taluka": [],
            "District": [],
        }

        for plan in plans:
            entity_name = plan.entity_name
            if plan.plan_type == "Village":
                data["Village"].append(entity_name)
            elif plan.plan_type == "Taluka":
                data["Taluka"].append(entity_name)
            elif plan.plan_type == "District":
                data["District"].append(entity_name)

        return data

    class Meta:
        verbose_name = "User"
        verbose_name_plural = "Users"
        ordering = ["name", "email"]




class UserProfile(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="profile"
    )
    login_as = models.CharField(max_length=255, blank=True, null=True)
    user_type = models.CharField(max_length=255, blank=True, null=True)

    def __str__(self):
        return self.user.name + "--" + str(self.user.email)

    class Meta:
        verbose_name = "User Profile"
        verbose_name_plural = "User Profiles"
        ordering = ["user__name", "user__email"]



class OTPVerification(models.Model):
    email = models.EmailField(unique=True)
    otp = models.CharField(max_length=6)
    expires_at = models.DateTimeField()
    is_verified = models.BooleanField(default=False)
    verification_token = models.UUIDField(default=None, null=True, blank=True)
    token_expires_at = models.DateTimeField(null=True, blank=True)

    def is_valid(self):
        """ Check if the OTP is still valid """
        return self.expires_at > now()

    @staticmethod
    def cleanup_expired(email):
        """ Delete expired OTPs for a given email """
        OTPVerification.objects.filter(email=email).filter(
            expires_at__lt=now()
        ).delete()
