# backend/customers/admin.py
from django.contrib import admin
from .models import Customer, LoyaltyAccount

class LoyaltyAccountInline(admin.StackedInline):
    model = LoyaltyAccount
    extra = 0

@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ('name', 'mobile', 'shop', 'email')
    search_fields = ('name', 'mobile', 'shop__name')
    raw_id_fields = ('shop',)
    inlines = [LoyaltyAccountInline]