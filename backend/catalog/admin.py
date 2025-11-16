# backend/catalog/admin.py
from django.contrib import admin
from .models import Product

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('name', 'shop', 'price', 'quantity', 'is_active', 'updated_at')
    list_filter = ('shop', 'is_active', 'unit')
    search_fields = ('name', 'sku', 'shop__name')
    list_editable = ('price', 'quantity', 'is_active')
    raw_id_fields = ('shop',)