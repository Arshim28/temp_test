from django.contrib import admin

from .models import FixedMVPlans, FixedReportPlans, MVPlanOrder, ReportPlanOrder


class FixedMVPlansAdmin(admin.ModelAdmin):
    list_display = ('id', 'plan_name', 'price', 'created_at', )
    list_filter = ('created_at',)
    search_fields = ('name', 'price', 'duration')
    ordering = ('-created_at',)

class FixedReportPlansAdmin(admin.ModelAdmin):
    list_display = ('id', 'plan_name', 'quantity','price',  'created_at')
    list_filter = ('created_at',)
    search_fields = ('name', 'price')
    ordering = ('-created_at',)

class ReportPlanOrderAdmin(admin.ModelAdmin):
    list_display = ('user', 'status', 'created_at', 'updated_at')
    list_filter = ('status', 'created_at', 'updated_at')
    search_fields = ('user',  'status')
    ordering = ('-created_at',)

class MVPlanOrderAdmin(admin.ModelAdmin):
    list_display = ('user', 'status', 'created_at')
    list_filter = ('status', 'created_at', 'updated_at')
    search_fields = ('user', 'status')
    ordering = ('-created_at',)

admin.site.register(FixedMVPlans, FixedMVPlansAdmin)
admin.site.register(FixedReportPlans, FixedReportPlansAdmin)
admin.site.register(MVPlanOrder, MVPlanOrderAdmin)
admin.site.register(ReportPlanOrder, ReportPlanOrderAdmin)
