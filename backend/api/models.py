# backend/api/models.py

from django.db import models
from django.conf import settings
from django.utils import timezone
from datetime import timedelta


# ========== SUBSCRIPTION PLANS ==========
class SubscriptionPlan(models.Model):
    # --- NEW: Defined Plan Types ---
    PLAN_TYPE_CHOICES = [
        ('FREE', 'Free'),
        ('BASIC', 'Basic'),
        ('PRO', 'Pro'),
        ('PREMIUM', 'Premium'),
    ]
    
    DURATION_CHOICES = [
        ('MONTHLY', 'Monthly'),
        ('YEARLY', 'Yearly'),
    ]
    
    name = models.CharField(max_length=100, default='Default Plan Name')
    # --- UPDATED: plan_type now has more choices ---
    plan_type = models.CharField(max_length=20, choices=PLAN_TYPE_CHOICES, default='FREE')
    duration = models.CharField(max_length=20, choices=DURATION_CHOICES, default='MONTHLY')
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    duration_days = models.IntegerField(help_text="Plan validity in days", default=30)
    
    # Features (JSON field for flexibility)
    # e.g., {"dashboard": true, "stock": true, "billing": true, "max_bills_per_week": 100, "reports": false, "export": false, "whatsapp_reports": false}
    features = models.JSONField(default=dict, blank=True)
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['plan_type', 'duration']

    def __str__(self):
        return f"{self.get_plan_type_display()} - {self.get_duration_display()} (₹{self.price})"


# ========== USER SUBSCRIPTION ==========
class UserSubscription(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="usersubscription") # Added related_name
    plan = models.ForeignKey(SubscriptionPlan, null=True, blank=True, on_delete=models.SET_NULL)
    
    # Trial management
    trial_used = models.BooleanField(default=False)
    trial_start_date = models.DateTimeField(null=True, blank=True)
    trial_end_date = models.DateTimeField(null=True, blank=True)
    
    # Subscription dates
    start_date = models.DateTimeField(null=True, blank=True)
    end_date = models.DateTimeField(null=True, blank=True)
    
    # Status
    active = models.BooleanField(default=False)
    allowed_by_admin = models.BooleanField(default=False)  # Admin override
    
    # Grace period
    grace_period_end = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def start_trial(self):
        """Start 7-day free trial"""
        if not self.trial_used:
            try:
                # --- UPDATED: Find the 'FREE' plan ---
                free_plan = SubscriptionPlan.objects.get(plan_type='FREE')
                self.plan = free_plan
                self.trial_used = True
                self.trial_start_date = timezone.now()
                self.trial_end_date = timezone.now() + timedelta(days=free_plan.duration_days) # Use duration from plan
                self.active = True # Trial is active
                self.save()
                return True
            except SubscriptionPlan.DoesNotExist:
                return False # Cannot start trial if FREE plan is not seeded
        return False

    def activate_plan(self, plan):
        """Activate paid plan"""
        self.plan = plan
        self.active = True
        self.start_date = timezone.now()
        self.end_date = timezone.now() + timedelta(days=plan.duration_days)
        self.grace_period_end = None  # Clear grace period
        
        # --- FIX: Explicitly clear all trial fields ---
        self.trial_start_date = None # Add this
        self.trial_end_date = None    # This line was already here
        # self.trial_used = True # Keep this as a historical record
        # --- END FIX ---
        
        self.save()

    def is_valid(self):
        """Check if subscription is valid"""
        if self.allowed_by_admin:
            return True
        
        now = timezone.now()
        
        # Check trial
        # (This logic is fine)
        if self.active and self.trial_used and self.trial_end_date and now <= self.trial_end_date:
            return True
        
        # --- FIX: This is the main bug fix ---
        # Check paid subscription
        # OLD LOGIC: if self.active and not self.trial_used and self.end_date and now <= self.end_date:
        # NEW LOGIC:
        if self.active and self.end_date and now <= self.end_date and not self.is_trial_active():
        # --- END FIX ---
            return True
        
        # Check grace period
        if self.grace_period_end and now <= self.grace_period_end:
            return True
        
        return False

    def is_trial_active(self):
        """Check if trial is currently active"""
        # --- FIX: Add check for self.plan.plan_type ---
        # This prevents a paid plan from being seen as a trial
        if not self.trial_used or not self.active or not self.plan or self.plan.plan_type != 'FREE':
            return False
        # --- END FIX ---
        now = timezone.now()
        return self.trial_end_date and now <= self.trial_end_date

    def get_plan_type(self):
        """Get current plan type"""
        if self.plan:
            return self.plan.plan_type
        return None
    
    # --- NEW: Centralized Feature Check ---
    def get_features(self):
        """Returns the features JSON of the current valid plan."""
        if not self.is_valid():
            return {}
            
        if self.plan:
            return self.plan.features or {}
            
        return {} # Fallback

    def has_feature(self, feature_name):
        """Check if user has access to a specific feature"""
        if self.allowed_by_admin:
            return True
        
        features = self.get_features()
        return features.get(feature_name, False)

    def enter_grace_period(self):
        """Enter 3-day grace period after subscription expires"""
        self.grace_period_end = timezone.now() + timedelta(days=3)
        self.active = False
        self.save()

    def __str__(self):
        return f"{self.user.username} - {self.plan or 'No Plan'}"


# ========== PAYMENT TRACKING ==========
class Payment(models.Model):
    STATUS_CHOICES = [
        ('CREATED', 'Created'),
        ('PENDING', 'Pending'),
        ('SUCCESS', 'Success'),
        ('FAILED', 'Failed'),
    ]
    
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="payments")
    plan = models.ForeignKey(SubscriptionPlan, on_delete=models.SET_NULL, null=True)
    
    # Razorpay details
    order_id = models.CharField(max_length=255, unique=True)
    payment_id = models.CharField(max_length=255, blank=True, null=True)
    signature = models.CharField(max_length=500, blank=True, null=True)
    
    # Payment info
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=10, default='INR')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='CREATED')
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Admin notes
    notes = models.TextField(blank=True, null=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} | {self.plan} | {self.status} | ₹{self.amount}"


# ========== EXPENSES (PRO FEATURE) ==========
class Expense(models.Model):
    CATEGORY_CHOICES = [
        ('RENT', 'Rent'),
        ('UTILITIES', 'Utilities'),
        ('SALARY', 'Salary'),
        ('INVENTORY', 'Inventory Purchase'),
        ('TRANSPORT', 'Transport'),
        ('MAINTENANCE', 'Maintenance'),
        ('OTHER', 'Other'),
    ]
    
    shop = models.ForeignKey('shops.Shop', on_delete=models.CASCADE, related_name='expenses')
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    description = models.TextField()
    date = models.DateField(default=timezone.now)
    
    # Optional: attach invoice/receipt
    receipt_number = models.CharField(max_length=100, blank=True, null=True)
    vendor_name = models.CharField(max_length=200, blank=True, null=True)
    
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date']

    def __str__(self):
        return f"{self.category} - ₹{self.amount} - {self.date}"