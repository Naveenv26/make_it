# backend/api/admin.py
from django.contrib import admin
from .models import SubscriptionPlan # Removed UserSubscription

# This admin is great, keep it.
@admin.register(SubscriptionPlan)
class SubscriptionPlanAdmin(admin.ModelAdmin):
    list_display = ("name", "plan_type", "duration", "price", "duration_days", "is_active")
    list_editable = ("price", "is_active")
    list_filter = ("plan_type", "duration", "is_active")
    search_fields = ("name",)

# We remove UserSubscriptionAdmin because it's
# already an inline on the User page, which is better.