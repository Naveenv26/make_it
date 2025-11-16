# backend/sales/admin.py
from django.contrib import admin
from .models import Invoice, InvoiceItem

class InvoiceItemInline(admin.TabularInline):
    model = InvoiceItem
    raw_id_fields = ('product',)
    extra = 0
    readonly_fields = ('line_total',)

@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ('number', 'shop', 'customer_name', 'grand_total', 'status', 'invoice_date')
    list_filter = ('status', 'shop', 'invoice_date')
    search_fields = ('number', 'customer_name', 'customer_mobile', 'shop__name')
    raw_id_fields = ('shop', 'customer', 'created_by')
    inlines = [InvoiceItemInline]
    readonly_fields = ('created_at', 'updated_at')