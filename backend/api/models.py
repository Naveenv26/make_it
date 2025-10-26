from django.db import models
from django.conf import settings
from django.utils import timezone
from datetime import timedelta


# ========== SUBSCRIPTION PLANS ==========
class SubscriptionPlan(models.Model):
    PLAN_TYPE_CHOICES = [
        ('BASIC', 'Basic'),
        ('PRO', 'Pro'),
    ]
    
    DURATION_CHOICES = [
        ('MONTHLY', 'Monthly'),
        ('SIX_MONTH', '6 Months'),
        ('YEARLY', 'Yearly'),
    ]
    
    name = models.CharField(max_length=100, default='Default Plan Name') # Add a default name
    plan_type = models.CharField(max_length=20, choices=PLAN_TYPE_CHOICES, default='BASIC')
    duration = models.CharField(max_length=20, choices=DURATION_CHOICES, default='MONTHLY')
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    duration_days = models.IntegerField(help_text="Plan validity in days", default=30)
    
    features = models.JSONField(default=dict, blank=True)    
    # Features (JSON field for flexibility)
    features = models.JSONField(default=dict, blank=True)
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['plan_type', 'duration']

    def __str__(self):
        return f"{self.get_plan_type_display()} - {self.get_duration_display()} (₹{self.price})"


# ========== USER SUBSCRIPTION ==========
class UserSubscription(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
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
        """Start 7-day free trial with full Basic features"""
        if not self.trial_used:
            self.trial_used = True
            self.trial_start_date = timezone.now()
            self.trial_end_date = timezone.now() + timedelta(days=7)
            self.active = True
            self.save()
            return True
        return False

    def activate_plan(self, plan):
        """Activate paid plan"""
        self.plan = plan
        self.active = True
        self.start_date = timezone.now()
        self.end_date = timezone.now() + timedelta(days=plan.duration_days)
        self.grace_period_end = None  # Clear grace period
        self.save()

    def is_valid(self):
        """Check if subscription is valid"""
        if self.allowed_by_admin:
            return True
        
        now = timezone.now()
        
        # Check trial
        if self.trial_end_date and now <= self.trial_end_date:
            return True
        
        # Check paid subscription
        if self.active and self.end_date and now <= self.end_date:
            return True
        
        # Check grace period
        if self.grace_period_end and now <= self.grace_period_end:
            return True
        
        return False

    def is_trial_active(self):
        """Check if trial is currently active"""
        if not self.trial_used:
            return False
        now = timezone.now()
        return self.trial_end_date and now <= self.trial_end_date

    def get_plan_type(self):
        """Get current plan type"""
        if self.is_trial_active():
            return 'BASIC'  # Trial gives Basic features
        if self.plan:
            return self.plan.plan_type
        return None

    def has_feature(self, feature_name):
        """Check if user has access to a specific feature"""
        if self.allowed_by_admin:
            return True
        
        if not self.is_valid():
            return False
        
        plan_type = self.get_plan_type()
        
        if plan_type == 'PRO':
            return True  # Pro has all features
        
        if plan_type == 'BASIC':
            # Basic features only
            basic_features = ['billing', 'invoice_view', 'stock_view', 'dashboard']
            return feature_name in basic_features
        
        return False

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