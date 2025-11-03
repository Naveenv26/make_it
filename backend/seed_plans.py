# Run this after migrations: python manage.py shell < backend/seed_plans.py

from api.models import SubscriptionPlan

# Clear existing plans to avoid duplicates
SubscriptionPlan.objects.all().delete()
print("Cleared old plans...")

# ========== 1. FREE (TRIAL) PLAN ==========
SubscriptionPlan.objects.create(
    name="Free Trial",
    plan_type="FREE",
    duration="MONTHLY", # Duration is nominal, controlled by 7 days
    price=0,
    duration_days=7, # The trial duration
    features={
        "dashboard": True,
        "stock": True,
        "billing": True,
        "max_bills_per_week": 100,
        "reports": False,
        "export": False,
        "whatsapp_reports": False
    },
    is_active=True # This plan must be active for trials to work
)

# ========== 2. BASIC PLANS ==========
SubscriptionPlan.objects.create(
    name="Basic Monthly",
    plan_type="BASIC",
    duration="MONTHLY",
    price=149, # Your price: 99
    duration_days=30,
    features={
        "dashboard": True,
        "stock": True,
        "billing": True,
        "max_bills_per_week": -1, # -1 for unlimited
        "reports": True,
        "export": False,
        "whatsapp_reports": False
    },
    is_active=True
)

SubscriptionPlan.objects.create(
    name="Basic Yearly",
    plan_type="BASIC",
    duration="YEARLY",
    price=1499, # (Approx ₹125/mo)
    duration_days=365,
    features={
        "dashboard": True,
        "stock": True,
        "billing": True,
        "max_bills_per_week": -1,
        "reports": True,
        "export": False,
        "whatsapp_reports": False
    },
    is_active=True
)

# ========== 3. PRO PLANS ==========
SubscriptionPlan.objects.create(
    name="Pro Monthly",
    plan_type="PRO",
    duration="MONTHLY",
    price=299, # Your price: 199
    duration_days=30,
    features={
        "dashboard": True,
        "stock": True,
        "billing": True,
        "max_bills_per_week": -1,
        "reports": True,
        "export": True, # Pro Feature
        "whatsapp_reports": False
    },
    is_active=True
)

SubscriptionPlan.objects.create(
    name="Pro Yearly",
    plan_type="PRO",
    duration="YEARLY",
    price=2999, # (Approx ₹250/mo)
    duration_days=365,
    features={
        "dashboard": True,
        "stock": True,
        "billing": True,
        "max_bills_per_week": -1,
        "reports": True,
        "export": True,
        "whatsapp_reports": False
    },
    is_active=True
)

# ========== 4. PREMIUM PLANS ==========
SubscriptionPlan.objects.create(
    name="Premium Monthly",
    plan_type="PREMIUM",
    duration="MONTHLY",
    price=499, # Your price: 249
    duration_days=30,
    features={
        "dashboard": True,
        "stock": True,
        "billing": True,
        "max_bills_per_week": -1,
        "reports": True,
        "export": True,
        "whatsapp_reports": True # Premium Feature
    },
    is_active=True
)

SubscriptionPlan.objects.create(
    name="Premium Yearly",
    plan_type="PREMIUM",
    duration="YEARLY",
    price=4999, # (Approx ₹417/mo)
    duration_days=365,
    features={
        "dashboard": True,
        "stock": True,
        "billing": True,
        "max_bills_per_week": -1,
        "reports": True,
        "export": True,
        "whatsapp_reports": True
    },
    is_active=True
)

print("✅ Subscription plans created successfully!")
print("\nPlans created:")
for plan in SubscriptionPlan.objects.all():
    print(f"  - {plan.name} (₹{plan.price} for {plan.duration_days} days)")
