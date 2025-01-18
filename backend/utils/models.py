import uuid

from datetime import timedelta
from django.utils import timezone
from django.db import models
from user_auth.models import CustomUser

PLAN_TYPE = [("Village", "Village"), ("District", "District"), ("Talluka", "Talluka")]

# TODO: Make this dynamic, so that this can be changed from the admin panel.
ALLOWED_TRANSACTIONS = {"Village": 5, "District": 5, "Talluka": 5}


class Plan(models.Model):
    """Model for Plans"""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    plan_type = models.CharField(
        choices=PLAN_TYPE, null=False, blank=False, max_length=255
    )
    entity_name = models.CharField(max_length=255, null=False, blank=False)
    user = models.ForeignKey(
        to="user_auth.CustomUser",
        related_name="plans",
        on_delete=models.CASCADE,
        db_index=True,
    )

    duration = models.IntegerField(null=False, blank=False, default=0)  # in months

    @property
    def total_transactions(self):
        """
        Returns the total number of transactions associated with this user.
        """
        return self._get_transaction_count()

    def _get_transaction_count(self):
        """
        Helper method to count transactions associated with this user.
        """
        return self.transactions.count()

    @property
    def valid_till(self):
        """
        Calculates the valid_till date based on created_at and duration.
        """
        return self.created_at + timedelta(days=self.duration * 30)

    @property
    def is_valid(self):
        """
        Checks whether the valid_till date is in the future.
        """
        return self.valid_till > timezone.now()

    def __str__(self):
        return self.plan_type + "--" + self.entity_name

    class Meta:
        ordering = ["-created_at"]


class Transaction(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    plan = models.ForeignKey(
        to="utils.Plan",
        on_delete=models.CASCADE,
        db_index=True,
        related_name="transactions",
    )
    details = models.JSONField(null=True, blank=True)

    def save(self, *args, **kwargs):
        """
        Override the save method to enforce transaction limits based on the user's plan.
        """
        plan = Plan.objects.get(id=self.plan.id)
        total_transactions = plan.total_transactions

        # Check if the number of transactions exceeds the allowed limit for the plan
        if total_transactions >= ALLOWED_TRANSACTIONS[plan.plan_type]:
            raise ValueError(
                f"You have exceeded the allowed transactions for the {plan.plan_type} plan. "
                f"Allowed: {ALLOWED_TRANSACTIONS[plan.plan_type]}, Used: {total_transactions}."
            )

        # Call the original save method if validation passes
        super().save(*args, **kwargs)

    @property
    def user(self):
        """The  property."""
        return self._get_user

    def _get_user(self):
        plan = Plan.objects.get(id=self.plan.id)
        user = plan.user
        return user

    class Meta:
        ordering = ["created_at"]


# NOTE: Test Models for now, change later on.


class Village(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    name = models.CharField(max_length=255, null=False, blank=False)
    district = models.ForeignKey(to="District", on_delete=models.CASCADE, db_index=True)
    talluka = models.ForeignKey(to="Talluka", on_delete=models.CASCADE, db_index=True)
    data = models.JSONField(null=True, blank=True)

    class Meta:
        ordering = ["name"]


class District(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    name = models.CharField(max_length=255, null=False, blank=False)
    data = models.JSONField(null=True, blank=True)

    class Meta:
        ordering = ["name"]


class Talluka(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    name = models.CharField(max_length=255, null=False, blank=False)
    district = models.ForeignKey(to="District", on_delete=models.CASCADE, db_index=True)
    data = models.JSONField(null=True, blank=True)

    class Meta:
        ordering = ["name"]
