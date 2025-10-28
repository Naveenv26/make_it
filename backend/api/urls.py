# backend/api/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
         ResetPasswordView, check_subscription, create_order, SubscriptionPlanViewSet, RegisterView, ProductViewSet, CustomerViewSet, InvoiceViewSet,
    TaxProfileViewSet, ShopViewSet, MeViewSet, ReportsViewSet
)
# --- FIX: Import the correct login view and the register_shop view ---
from .auth_views import CookieTokenObtainPairView, CookieTokenRefreshView, logout_view
from shops.views import register_shop  # <-- Import the shop registration view

from .razorpay_webhook import razorpay_webhook
from .views import ForgotPasswordView, ResetPasswordView
# Import new payment views
from .payment_views import (
    # SubscriptionPlanViewSet is already imported above
    verify_payment,
    subscription_status,
    start_trial,
    payment_history,
    # razorpay_webhook is already imported above
)


router = DefaultRouter()
router.register(r'subscription-plans', SubscriptionPlanViewSet, basename='subscriptionplan')
router.register(r'products', ProductViewSet, basename='product')
router.register(r'customers', CustomerViewSet, basename='customer')
router.register(r'invoices', InvoiceViewSet, basename='invoice')
router.register(r'taxprofiles', TaxProfileViewSet, basename='taxprofile')
router.register(r'shops', ShopViewSet, basename='shop')
router.register(r'me', MeViewSet, basename='me')
router.register(r'reports', ReportsViewSet, basename='reports')

urlpatterns = [
    # --- FIX: Add the correct shop registration path ---
    path("register-shop/", register_shop, name="register_shop"),
    
    # Auth endpoints
    path("auth/register/", RegisterView.as_view(), name="register"), # This is your old one
    
    # --- FIX: Change the login path to match the frontend ---
    path("token/", CookieTokenObtainPairView.as_view(), name="login"), # Was "auth/login/"
    
    path("auth/refresh/", CookieTokenRefreshView.as_view(), name="token_refresh"),
    path("auth/logout/", logout_view, name="logout"),

    path("auth/forgot-password/", ForgotPasswordView.as_view(), name="forgot-password"),
    path("auth/reset-password/<uidb64>/<token>/", ResetPasswordView.as_view(), name="reset-password"),

    # Razorpay webhook & Payment routes
    path("payments/create-order/", create_order, name="create-order"),
    path("payments/verify-payment/", verify_payment, name="verify-payment"),
    path("payments/subscription-status/", subscription_status, name="subscription-status"),
    path("payments/start-trial/", start_trial, name="start-trial"),
    path("payments/history/", payment_history, name="payment-history"),
    path("payments/webhook/", razorpay_webhook, name="razorpay-webhook"),
    
    # API routes
    path("", include(router.urls)),
]