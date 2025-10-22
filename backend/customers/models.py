from django.db import models

class Customer(models.Model):
    shop = models.ForeignKey('shops.Shop', on_delete=models.CASCADE, related_name='customers')
    name = models.CharField(max_length=120)
    mobile = models.CharField(max_length=20, db_index=True)
    email = models.EmailField(blank=True)
    address = models.TextField(blank=True)
    def __str__(self):
        return f"{self.name} ({self.mobile})"

class LoyaltyAccount(models.Model):
    shop = models.ForeignKey('shops.Shop', on_delete=models.CASCADE)
    customer = models.OneToOneField(Customer, on_delete=models.CASCADE, related_name='loyalty')
    points = models.PositiveIntegerField(default=0)
    earn_rate = models.PositiveIntegerField(default=100)  # ₹ per point
    redeem_value = models.DecimalField(max_digits=6, decimal_places=2, default=1)  # ₹ per point
    def __str__(self):
        return f"Loyalty({self.customer_id}): {self.points}"
