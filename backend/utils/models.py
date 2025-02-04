import uuid

from datetime import timedelta
from django.utils import timezone
from django.db import models
from user_auth.models import CustomUser

PLAN_TYPE = [("Village", "Village"), ("District", "District"), ("Taluka", "Taluka"), ("Free", "Free")]

# TODO: Make this dynamic, so that this can be changed from the admin panel.
ALLOWED_TRANSACTIONS = {"Village": 5, "District": 5, "Taluka": 5, "Talluka": 5, "Free":3}

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
        return (self.valid_till > timezone.now()) and (self.total_transactions < ALLOWED_TRANSACTIONS[self.plan_type])

    def __str__(self):
        return self.plan_type + "--" + self.entity_name

    class Meta:
        ordering = ["-created_at"]


class ReportPlan(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    user = models.ForeignKey(
        to="user_auth.CustomUser",
        related_name="report_plans",
        on_delete=models.CASCADE,
        db_index=True,
    )
    quantity = models.IntegerField(null=False, blank=False, default=0)
    duration = models.IntegerField(null=False, blank=False, default=0)  # in months

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
        return self.valid_till > timezone.now() and self.total_transactions < self.quantity

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

    def __str__(self):
        return f"Report Plan for {self.user.email} - {self.quantity} reports"

    class Meta:
        ordering = ["-created_at"]


class ReportTransaction(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    report_plan = models.ForeignKey(
        to="utils.ReportPlan",
        on_delete=models.CASCADE,
        db_index=True,
        related_name="transactions",
    )
    details = models.JSONField(null=True, blank=True)

    def save(self, *args, **kwargs):
        """
        Override the save method to enforce transaction limits based on the user's plan.
        """
        report_plan = ReportPlan.objects.get(id=self.report_plan.id)
        total_transactions = report_plan.transactions.count()

        # Check if the number of transactions exceeds the allowed limit for the plan
        if total_transactions >= report_plan.quantity:
            raise ValueError(
                f"You have exceeded the allowed transactions for the report plan. "
                f"Allowed: {report_plan.quantity}, Used: {total_transactions}."
            )

        # Call the original save method if validation passes
        super().save(*args, **kwargs)

    @property
    def user(self):
        """The  property."""
        return self._get_user

    def _get_user(self):
        report_plan = ReportPlan.objects.get(id=self.report_plan.id)
        user = report_plan.user
        return user

    class Meta:
        ordering = ["created_at"]



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
        """The user property."""
        return self._get_user

    def _get_user(self):
        plan = Plan.objects.get(id=self.plan.id)
        user = plan.user
        return user

    class Meta:
        ordering = ["created_at"]







class MaharashtraMetadata(models.Model):
    """Model for Maharashtra Metadata
    Note: always use using('external_db') to access this model.
    """
    ogc_fid = models.AutoField(primary_key=True)
    sid = models.IntegerField()
    state_code = models.CharField(max_length=10)
    state_name = models.CharField(max_length=100)
    district_code = models.CharField(max_length=10)
    district_name = models.CharField(max_length=100)
    taluka_code = models.CharField(max_length=10)
    taluka_name = models.CharField(max_length=100)
    village_code = models.CharField(max_length=10)
    village_version = models.CharField(max_length=10)
    village_name = models.CharField(max_length=100)
    village_name_marathi = models.CharField(max_length=100)
    village_status = models.CharField(max_length=20)
    census_2001_code = models.CharField(max_length=10)
    census_2011_code = models.CharField(max_length=10)

    class Meta:
        managed = False
        db_table = 'maharashtra_metadata'


    def __str__(self):
        return f"{self.village_name}, {self.district_name}, {self.state_name}"
