from django.db import models

class Product(models.Model):
    UNIT_CHOICES = [('pcs','pcs'), ('kg','kg')]
    shop = models.ForeignKey('shops.Shop', on_delete=models.CASCADE, related_name='products')
    name = models.CharField(max_length=140)
    sku = models.CharField(max_length=64, blank=True)
    unit = models.CharField(max_length=8, choices=UNIT_CHOICES, default='pcs')
    price = models.DecimalField(max_digits=10, decimal_places=2)
    cost_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    tax_rate = models.DecimalField(max_digits=4, decimal_places=1, default=0) # GST %
    low_stock_threshold = models.PositiveIntegerField(default=0)
    quantity = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    is_active = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)
    def __str__(self):
        return self.name
