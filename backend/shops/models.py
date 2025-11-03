from django.db import models
from django.utils import timezone

class SubscriptionPlan(models.Model):
    name = models.CharField(max_length=50)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    features = models.JSONField(default=dict, blank=True)

    def __str__(self):
        return self.name


class Shop(models.Model):
    name = models.CharField(max_length=120)
    address = models.TextField(blank=True)
    gstin = models.CharField(max_length=20, blank=True)
    contact_phone = models.CharField(max_length=20, blank=True)
    contact_email = models.EmailField(blank=True)
    language = models.CharField(max_length=20, default="en")
    business_type = models.CharField(max_length=40, default="Kirana / Grocery")
    counter_invoice = models.PositiveIntegerField(default=0)

    # --- NEW: Field for Premium WhatsApp feature ---
    whatsapp_number = models.CharField(max_length=20, blank=True, null=True, help_text="e.g., +919876543210")
    # ----------------------------------------------

    active_subscription = models.ForeignKey(
        SubscriptionPlan,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="shops",
    )
    subscription_end_date = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    last_payment_date = models.DateField(null=True, blank=True)

    created_at = models.DateTimeField(default=timezone.now)

    def __str__(self):
        return self.name


class TaxProfile(models.Model):
    shop = models.OneToOneField(
        Shop, on_delete=models.CASCADE, related_name="tax_profile"
    )
    default_rates = models.JSONField(default=list)
    overrides = models.JSONField(default=dict, blank=True)

    def __str__(self):
        return f"TaxProfile({self.shop.name})"
