from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import register_shop, ShopViewSet, AdminShopViewSet, SubscriptionPlanViewSet, TaxProfileViewSet

router = DefaultRouter()
router.register(r'shops', ShopViewSet, basename='shop')
router.register(r'admin/shops', AdminShopViewSet, basename='admin-shops')
router.register(r'subscription-plans', SubscriptionPlanViewSet, basename='subscriptionplan')
router.register(r'tax-profiles', TaxProfileViewSet, basename='taxprofile')

urlpatterns = [
    # The registration view is now at the root of this app's URLs
    path("register/", register_shop, name="register-shop"),
    
    # The router URLs are included correctly
    path("", include(router.urls)),
]