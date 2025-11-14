# backend/shops/admin.py
from django.contrib import admin
from .models import Shop, TaxProfile # <-- Removed SubscriptionPlan

# This model is registered in api/admin.py, so we remove it from here
# @admin.register(SubscriptionPlan)
# class SubscriptionPlanAdmin(admin.ModelAdmin):
#     list_display = ("name", "price")
#     search_fields = ("name",)


@admin.register(Shop)
class ShopAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "business_type",
        "is_active", # Removed fields that aren't on this model
    )
    list_filter = ("business_type", "language", "is_active")
    search_fields = ("name", "contact_phone", "contact_email")
    
    # This makes it easier to find shops when linking them to users
    raw_id_fields = () 


@admin.register(TaxProfile)
class TaxProfileAdmin(admin.ModelAdmin):
    list_display = ("shop", "default_rates")
    search_fields = ("shop__name",)