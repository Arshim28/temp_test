from django.contrib import admin

from .models import Plan, Transaction, MaharashtraMetadata






class PlanAdmin(admin.ModelAdmin):
    list_display = (
        "plan_type",
        "user",
        "is_valid_display",
        "entity_name",
        "created_at",
        "total_transactions",
    )
    list_filter = ("created_at", "updated_at")
    search_fields = ("entity_name", "user__username", "user__email")
    ordering = ("-created_at",)


    def get_actions(self, request):
        actions = super().get_actions(request)
        access_level = request.user.access_level

        if access_level == "Admin":
            return actions

        return None

    @admin.display(boolean=True, description="Valid?")
    def is_valid_display(self, obj):
        return obj.is_valid


class TransactionAdmin(admin.ModelAdmin):
    list_display = ("plan", "user", "created_at")
    list_filter = ("plan",)
    ordering = ("-created_at",)



class ReportPlanAdmin(admin.ModelAdmin):
    list_display = (
        "user",
        "is_valid_display",
        "quantity",
        "created_at",
        "total_transactions",
    )
    list_filter = ("created_at", "updated_at")
    search_fields = ("user__username", "user__email")
    ordering = ("-created_at",)

    @admin.display(boolean=True, description="Valid?")
    def is_valid_display(self, obj):
        return obj.is_valid


class ReportTransactionAdmin(admin.ModelAdmin):
    list_display = ("report_plan", "user", "created_at")
    list_filter = ("report_plan",)
    ordering = ("-created_at",)




# admin.site.disable_action("delete_selected")


admin.site.register(Plan, PlanAdmin)
admin.site.register(ReportPlan, ReportPlanAdmin)
admin.site.register(ReportTransaction, ReportTransactionAdmin)
admin.site.register(Transaction, TransactionAdmin)
