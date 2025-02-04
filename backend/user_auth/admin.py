from django.contrib import admin
from django import forms
from django.contrib.admin import ModelAdmin
from django.contrib.auth.forms import ReadOnlyPasswordHashField
from django.contrib.auth.admin import UserAdmin
from user_auth.models import CustomUser, UserProfile
from django.contrib.admin.sites import AdminSite
from django.contrib.admin.forms import AuthenticationForm
from django.contrib.admin import SimpleListFilter

from django.urls import reverse
import logging


class AccessLevelFilter(SimpleListFilter):
    title = "Access Level"  # Displayed title in the filter sidebar
    parameter_name = "access_level"  # URL parameter for the filter

    def lookups(self, request, model_admin):
        """
        Returns the filter options as a list of tuples.
        """
        return [
            ("Admin", "Admin"),
            ("District", "District"),
            ("Taluka", "Taluka"),
            ("Village", "Village"),
            ("Inactive", "Inactive"),
        ]

    def queryset(self, request, queryset):
        """
        Filters the queryset based on the selected filter option.
        """
        value = self.value()
        if not value:
            return queryset
        if value == "Admin":
            return queryset.filter(is_superuser=True)
        elif value == "Inactive":
            return queryset.filter(is_active=False)
        else:
            return queryset.filter(plans__plan_type=value).distinct()


class CustomUserChangeForm(forms.ModelForm):
    password = ReadOnlyPasswordHashField(
        label="Password",
        help_text="Raw passwords are not stored, so there is no way to see this user's password, "
        "but you can change the password using the form below.",
    )

    class Meta:
        model = CustomUser
        fields = (
            "email",
            "password",
            "is_active",
            "is_staff",
            "is_superuser",
            "phone_number",
            "name",
        )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        if self.instance.pk:  # Only if the user already exists
            password_change_url = reverse(
                "admin:auth_user_password_change", args=[self.instance.pk]
            )
            self.fields[
                "password"
            ].help_text += f' <a href="{password_change_url}">Change password here</a>.'

    def clean_password(self):
        # Return the initial password value since it's not changeable here
        return self.initial["password"]


class CustomUserAdmin(UserAdmin):
    form = CustomUserChangeForm

    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Personal Info", {"fields": ("name", "phone_number")}),
        (
            "Permissions",
            {
                "fields": (
                    "is_active",
                    "is_staff",
                    "is_superuser",
                    "groups",
                    "user_permissions",
                )
            },
        ),
    )

    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": (
                    "email",
                    "name",
                    "password1",
                    "password2",
                    "is_active",
                    "is_staff",
                    "is_superuser",
                ),
            },
        ),
    )

    list_display = ["email", "name", "phone_number", "is_staff", "access_level"]
    search_fields = ["email", "name", "phone_number"]
    list_filter = ["is_staff", "is_active", AccessLevelFilter]
    ordering = ["email"]


class UserProfileAdmin(ModelAdmin):
    list_display = ["user", "login_as", "user_type"]
    search_fields = ["user__email", "user_type"]
    list_filter = ["user_type", "login_as"]

admin.site.register(UserProfile, UserProfileAdmin)
admin.site.register(CustomUser, CustomUserAdmin)
