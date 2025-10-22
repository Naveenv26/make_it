# backend/api/admin.py
from django.contrib import admin
from .models import UserSubscription, SubscriptionPlan

@admin.register(UserSubscription)
class UserSubscriptionAdmin(admin.ModelAdmin):
    list_display = ("user", "plan", "active", "allowed_by_admin", "end_date")
    list_editable = ("active", "allowed_by_admin")
    list_filter = ("active", "allowed_by_admin", "plan")
    search_fields = ("user__username", "plan__name")

@admin.register(SubscriptionPlan)
class SubscriptionPlanAdmin(admin.ModelAdmin):
    list_display = ("name", "price", "duration_days", "created_at")
    search_fields = ("name",)
