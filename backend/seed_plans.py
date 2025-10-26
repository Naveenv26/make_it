# Run this after migrations: python manage.py shell < seed_plans.py

from api.models import SubscriptionPlan

# Clear existing plans
SubscriptionPlan.objects.all().delete()

# ========== BASIC PLANS ==========
SubscriptionPlan.objects.create(
    name="Basic - Monthly",
    plan_type="BASIC",
    duration="MONTHLY",
    price=99,
    duration_days=30,
    features={
        "billing": True,
        "invoice_view": True,
        "stock_view": True,
        "dashboard": True,
        "max_invoices": 1000,
        "reports": False,
        "expenses": False,
        "gst_reports": False,
        "export": False,
    }
)

SubscriptionPlan.objects.create(
    name="Basic - 6 Months",
    plan_type="BASIC",
    duration="SIX_MONTH",
    price=499,  # ₹83/month
    duration_days=180,
    features={
        "billing": True,
        "invoice_view": True,
        "stock_view": True,
        "dashboard": True,
        "max_invoices": 1000,
        "reports": False,
        "expenses": False,
        "gst_reports": False,
        "export": False,
    }
)

SubscriptionPlan.objects.create(
    name="Basic - Yearly",
    plan_type="BASIC",
    duration="YEARLY",
    price=999,  # ₹83/month
    duration_days=365,
    features={
        "billing": True,
        "invoice_view": True,
        "stock_view": True,
        "dashboard": True,
        "max_invoices": 1000,
        "reports": False,
        "expenses": False,
        "gst_reports": False,
        "export": False,
    }
)

# ========== PRO PLANS ==========
SubscriptionPlan.objects.create(
    name="Pro - Monthly",
    plan_type="PRO",
    duration="MONTHLY",
    price=149,
    duration_days=30,
    features={
        "billing": True,
        "invoice_view": True,
        "stock_view": True,
        "dashboard": True,
        "max_invoices": -1,  # Unlimited
        "reports": True,
        "expenses": True,
        "gst_reports": True,
        "profit_loss": True,
        "export": True,
        "crm": True,
        "advanced_analytics": True,
        "low_stock_alerts": True,
        "invoice_templates": True,
    }
)

SubscriptionPlan.objects.create(
    name="Pro - 6 Months + 1 Month Free",
    plan_type="PRO",
    duration="SIX_MONTH",
    price=799,  # 6 months + 1 free = 7 months @ ₹114/month
    duration_days=210,  # 7 months
    features={
        "billing": True,
        "invoice_view": True,
        "stock_view": True,
        "dashboard": True,
        "max_invoices": -1,
        "reports": True,
        "expenses": True,
        "gst_reports": True,
        "profit_loss": True,
        "export": True,
        "crm": True,
        "advanced_analytics": True,
        "low_stock_alerts": True,
        "invoice_templates": True,
    }
)

SubscriptionPlan.objects.create(
    name="Pro - Yearly + 2 Months Free",
    plan_type="PRO",
    duration="YEARLY",
    price=1499,  # 12 months + 2 free = 14 months @ ₹107/month
    duration_days=420,  # 14 months
    features={
        "billing": True,
        "invoice_view": True,
        "stock_view": True,
        "dashboard": True,
        "max_invoices": -1,
        "reports": True,
        "expenses": True,
        "gst_reports": True,
        "profit_loss": True,
        "export": True,
        "crm": True,
        "advanced_analytics": True,
        "low_stock_alerts": True,
        "invoice_templates": True,
    }
)

print("✅ Subscription plans created successfully!")
print("\nPlans created:")
for plan in SubscriptionPlan.objects.all():
    print(f"  - {plan}")