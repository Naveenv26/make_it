# backend/api/models.py
from django.db import models
from django.conf import settings
from django.utils import timezone
from datetime import timedelta


# ---------- Shop ----------
class Shop(models.Model):
    name = models.CharField(max_length=100)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='shops'
    )
    address = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


# ---------- Product ----------
class Product(models.Model):
    shop = models.ForeignKey(Shop, on_delete=models.CASCADE, related_name="products")
    name = models.CharField(max_length=255)
    unit = models.CharField(max_length=50, default="pcs")
    price = models.DecimalField(max_digits=10, decimal_places=2)
    quantity = models.IntegerField(default=0)
    gst_percent = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    low_stock_threshold = models.IntegerField(default=5)

    def __str__(self):
        return self.name


# ---------- Customer ----------
class Customer(models.Model):
    shop = models.ForeignKey(Shop, on_delete=models.CASCADE, related_name="customers")
    name = models.CharField(max_length=255)
    mobile = models.CharField(max_length=20, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)

    def __str__(self):
        return self.name


# ---------- Invoice ----------
class Invoice(models.Model):
    shop = models.ForeignKey(Shop, on_delete=models.CASCADE, related_name="invoices")
    customer = models.ForeignKey(Customer, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    status = models.CharField(max_length=20, default="UNPAID")

    def __str__(self):
        return f"Invoice {self.id} - {self.shop.name}"

    def calculate_total(self):
        """Recalculate invoice total with GST"""
        total = 0
        for item in self.items.all():
            gst_amount = (item.price * item.quantity) * (item.product.gst_percent / 100)
            total += item.price * item.quantity + gst_amount
        self.total_amount = total
        self.save()


class InvoiceItem(models.Model):
    invoice = models.ForeignKey(Invoice, related_name="items", on_delete=models.CASCADE)
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.IntegerField(default=1)
    price = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f"{self.product.name} x {self.quantity}"


# ---------- TaxProfile ----------
class TaxProfile(models.Model):
    shop = models.OneToOneField(Shop, on_delete=models.CASCADE, related_name="tax_profile")
    gst_number = models.CharField(max_length=50, blank=True, null=True)
    pan_number = models.CharField(max_length=50, blank=True, null=True)

    def __str__(self):
        return f"Tax Profile for {self.shop.name}"


# ---------- SubscriptionPlan ----------
class SubscriptionPlan(models.Model):
    name = models.CharField(max_length=100)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    duration_days = models.IntegerField(help_text="Plan validity in days")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


# ---------- UserSubscription ----------
class UserSubscription(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    plan = models.ForeignKey(SubscriptionPlan, null=True, blank=True, on_delete=models.SET_NULL)
    start_date = models.DateTimeField(auto_now_add=True)
    end_date = models.DateTimeField()
    active = models.BooleanField(default=True)
    allowed_by_admin = models.BooleanField(default=False)  # Admin override

    def start_trial(self):
        """Start 7-day free trial"""
        self.active = True
        self.end_date = timezone.now() + timedelta(days=7)
        self.save()

    def activate_plan(self, plan):
        """Activate paid plan"""
        self.plan = plan
        self.active = True
        self.end_date = timezone.now() + timedelta(days=plan.duration_days)
        self.save()

    def deactivate(self):
        self.active = False
        self.save()

    def is_valid(self):
        """Check if subscription is valid (active + not expired OR admin override)"""
        if self.allowed_by_admin:
            return True
        if not self.active:
            return False
        if self.end_date and self.end_date < timezone.now():
            return False
        return True

    def __str__(self):
        return f"{self.user.username} - {'Active' if self.is_valid() else 'Expired'}"


# ---------- Payment ----------
class Payment(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="payments")
    plan = models.ForeignKey(SubscriptionPlan, on_delete=models.SET_NULL, null=True)
    order_id = models.CharField(max_length=255, unique=True)
    payment_id = models.CharField(max_length=255, blank=True, null=True)
    status = models.CharField(max_length=50, default="created")  # created, paid, failed
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username} | {self.plan} | {self.status}"
