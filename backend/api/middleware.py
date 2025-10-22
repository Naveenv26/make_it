# backend/api/middleware.py
from django.utils.deprecation import MiddlewareMixin
from django.http import JsonResponse
from django.urls import resolve

EXEMPT_PATHS = [
    "/api/auth/login/",
    "/api/auth/register/",
    "/api/auth/refresh/",
    "/api/auth/logout/",
    "/api/razorpay-webhook/",  # allow webhook
]

class SubscriptionMiddleware(MiddlewareMixin):
    def process_view(self, request, view_func, view_args, view_kwargs):
        # Skip exempt paths
        if request.path in EXEMPT_PATHS or request.path.startswith("/admin/"):
            return None  

        if not request.user.is_authenticated:
            return None  # normal auth middleware handles this

        # Get subscription
        subscription = getattr(request.user, "usersubscription", None)
        if not subscription or not subscription.is_valid():
            return JsonResponse(
                {"detail": "Your subscription has expired or payment required."},
                status=403
            )

        return None
