from rest_framework import viewsets, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from django.contrib.auth.hashers import make_password

from .models import Shop, SubscriptionPlan, TaxProfile
from .serializers import (
    ShopSerializer, AdminShopSerializer,
    SubscriptionPlanSerializer, TaxProfileSerializer,
    ShopRegistrationSerializer
)
from .permissions import IsSiteAdmin, IsShopOwner, IsShopkeeperOrOwner
from accounts.models import User


# ✅ Corrected Register Shop API View
@api_view(["POST"])
@permission_classes([permissions.AllowAny])
def register_shop(request):
    """
    This view MUST use the ShopRegistrationSerializer to handle the flat payload.
    """
    # This is the most important line. It tells Django to use the correct serializer.
    serializer = ShopRegistrationSerializer(data=request.data)

    if serializer.is_valid():
        shop = serializer.save()
        return Response(
            {"message": "Shop registered successfully", "shop_id": shop.id},
            status=status.HTTP_201_CREATED,
        )
    
    # If validation fails, this returns the specific errors.
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# ✅ Corrected Shop ViewSet (Secure)
class ShopViewSet(viewsets.ModelViewSet):
    """
    Manages shops. A site admin can see all shops.
    A shop owner or keeper can only see and manage their own shop.
    """
    serializer_class = ShopSerializer
    permission_classes = [permissions.IsAuthenticated, IsShopkeeperOrOwner]

    def get_queryset(self):
        """
        Filters the queryset to ensure users only see their own shop,
        unless they are a site administrator.
        """
        user = self.request.user
        if user.role == "SITE_ADMIN":
            return Shop.objects.all().select_related("active_subscription")
        if user.shop:
            return Shop.objects.filter(pk=user.shop.id).select_related("active_subscription")
        return Shop.objects.none()


# Admin Shop ViewSet (No changes needed)
class AdminShopViewSet(viewsets.ModelViewSet):
    queryset = Shop.objects.all().select_related("active_subscription")
    serializer_class = AdminShopSerializer
    permission_classes = [IsSiteAdmin]

    def perform_update(self, serializer):
        shop = serializer.save()
        if shop.active_subscription and shop.subscription_end_date:
            shop.is_active = True
            shop.save()
        return shop


# Subscription Plan ViewSet (No changes needed)
class SubscriptionPlanViewSet(viewsets.ModelViewSet):
    queryset = SubscriptionPlan.objects.all()
    serializer_class = SubscriptionPlanSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]


# TaxProfile ViewSet (No changes needed)
class TaxProfileViewSet(viewsets.ModelViewSet):
    queryset = TaxProfile.objects.all()
    serializer_class = TaxProfileSerializer
    permission_classes = [permissions.IsAuthenticated, IsShopkeeperOrOwner]

    def get_queryset(self):
        user = self.request.user
        if user.is_authenticated and user.shop:
            return TaxProfile.objects.filter(shop=user.shop)
        return TaxProfile.objects.none()