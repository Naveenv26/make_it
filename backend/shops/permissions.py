from rest_framework import permissions

class IsSiteAdmin(permissions.BasePermission):
    """Allow only SITE_ADMIN users."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and getattr(request.user, "role", None) == "SITE_ADMIN"

class IsShopOwner(permissions.BasePermission):
    """Allow only SHOP_OWNER users."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and getattr(request.user, "role", None) == "SHOP_OWNER"

class IsShopkeeperOrOwner(permissions.BasePermission):
    """Allow SHOP_OWNER and SHOPKEEPER users."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and getattr(request.user, "role", None) in ["SHOP_OWNER", "SHOP_KEEPER"]
