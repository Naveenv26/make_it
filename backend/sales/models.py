from django.db import models
from django.utils import timezone

class Invoice(models.Model):
    shop = models.ForeignKey("shops.Shop", on_delete=models.CASCADE)
    customer = models.ForeignKey("customers.Customer", on_delete=models.SET_NULL, null=True, blank=True)
    customer_name = models.CharField(max_length=140, null=True, blank=True)   # ✅ flexible
    customer_mobile = models.CharField(max_length=15, null=True, blank=True)  # ✅ flexible

    number = models.CharField(max_length=64, unique=True)
    invoice_date = models.DateTimeField(auto_now_add=True)

    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    tax_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    discount_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    grand_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    payment_mode = models.CharField(max_length=20, default="cash")
    created_by = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True)

    def __str__(self):
        return f"{self.number} - {self.customer_name or 'Unknown'}"


class InvoiceItem(models.Model):
    invoice = models.ForeignKey(Invoice, related_name="items", on_delete=models.CASCADE)
    product = models.ForeignKey('catalog.Product', on_delete=models.CASCADE)
    qty = models.DecimalField(max_digits=10, decimal_places=2)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    line_total = models.DecimalField(max_digits=12, decimal_places=2)

    # ✅ new field
    oversold = models.BooleanField(default=False)
    
    def __str__(self):
        return f"{self.product.name} x {self.qty}"

