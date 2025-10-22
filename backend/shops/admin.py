from django.contrib import admin
from .models import Shop, SubscriptionPlan, TaxProfile


@admin.register(SubscriptionPlan)
class SubscriptionPlanAdmin(admin.ModelAdmin):
    list_display = ("name", "price")
    search_fields = ("name",)


@admin.register(Shop)
class ShopAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "business_type",
        "active_subscription",
        "subscription_end_date",
        "is_active",
    )
    list_filter = ("business_type", "language", "is_active")
    search_fields = ("name", "contact_phone", "contact_email")


@admin.register(TaxProfile)
class TaxProfileAdmin(admin.ModelAdmin):
    list_display = ("shop", "default_rates")
    search_fields = ("shop__name",)
