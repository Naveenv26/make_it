# backend/api/views.py

# --- Django Imports ---
from django.conf import settings
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.db.models import Sum, Count

# --- 3rd Party Imports ---
import razorpay
from rest_framework import viewsets, generics, permissions, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response

# --- Local App Imports ---

# Serializers (from .serializers)
from .serializers import (
    SubscriptionPlanSerializer, 
    RegisterSerializer, 
    ProductSerializer, 
    CustomerSerializer,
    InvoiceSerializer, 
    TaxProfileSerializer, 
    ShopSerializer,
    PaymentSerializer, 
    UserSubscriptionSerializer,
    UserSerializer  # <-- FIX: This import will now work
)

# Models (from *THIS* app - 'api')
from .models import SubscriptionPlan, Payment, UserSubscription
# from .models import Expense # Uncomment if you use Expense in this file

# Models (from *OTHER* apps)
from catalog.models import Product
from customers.models import Customer
from sales.models import Invoice
from shops.models import Shop, TaxProfile

# Email utilities
from .emails import send_password_reset_email

# --- Setup ---
User = get_user_model()


# ---------- Registration ----------
class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = (permissions.AllowAny,)

# ---------- Subscription ----------
class SubscriptionPlanViewSet(viewsets.ModelViewSet):
    queryset = SubscriptionPlan.objects.all()
    serializer_class = SubscriptionPlanSerializer
    permission_classes = (permissions.IsAuthenticated,) # Keep as IsAuthenticated

# ---------- Reports ----------
class ReportsViewSet(viewsets.ViewSet):
    permission_classes = (permissions.IsAuthenticated,)

    @action(detail=False, methods=['get'])
    def sales_summary(self, request):
        # --- FIX: Filter invoices by the user's shop ---
        if not request.user.shop:
            return Response({"error": "User is not associated with a shop"}, status=400)
            
        # Use aggregation for efficiency
        summary = Invoice.objects.filter(shop=request.user.shop).aggregate(
            total_sales=Sum('grand_total'),
            total_invoices=Count('id')
        )
        
        return Response({
            "total_sales": summary['total_sales'] or 0,
            "total_invoices": summary['total_invoices'] or 0
        })

    def list(self, request):
        return Response({"detail": "Reports endpoint"})

# ---------- Base Class for Shop Filtering ----------
class ShopFilteredViewSet(viewsets.ModelViewSet):
    """
    Base ViewSet that automatically filters querysets by request.user.shop
    and assigns request.user.shop on creation.
    """
    permission_classes = (permissions.IsAuthenticated,) # Ensures user is logged in

    def get_queryset(self):
        """
        This method is called for LIST and RETRIEVE actions.
        It filters the queryset to only include objects for the user's shop.
        """
        user = self.request.user
        # Get the base queryset from the child class (e.g., Product.objects.all())
        base_queryset = super().get_queryset() 
        
        if user.is_authenticated and hasattr(user, 'shop') and user.shop is not None:
            # Filter by the user's shop
            return base_queryset.filter(shop=user.shop)
        
        # User has no shop, return empty
        return base_queryset.none() 

    def perform_create(self, serializer):
        """
        This method is called for CREATE actions.
        It automatically sets the 'shop' field to the user's shop.
        """
        if hasattr(self.request.user, 'shop') and self.request.user.shop is not None:
             # Save the new object, linking it to the user's shop
            serializer.save(shop=self.request.user.shop)
        else:
            # This should not happen if permissions are set correctly, but as a fallback
            raise permissions.ValidationError("You are not associated with a shop and cannot create this object.")

# ---------- Standard CRUD (FIXED with Filtering) ----------
class ProductViewSet(ShopFilteredViewSet): # <-- Use base class
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    # permission_classes are inherited


class CustomerViewSet(ShopFilteredViewSet): # <-- Use base class
    queryset = Customer.objects.all()
    serializer_class = CustomerSerializer
    # permission_classes are inherited


class InvoiceViewSet(ShopFilteredViewSet): # <-- Use base class
    queryset = Invoice.objects.all().order_by('-invoice_date') # Show newest first
    serializer_class = InvoiceSerializer
    # permission_classes are inherited


class TaxProfileViewSet(ShopFilteredViewSet): # <-- Use base class
    queryset = TaxProfile.objects.all()
    serializer_class = TaxProfileSerializer
    # permission_classes are inherited


class ShopViewSet(viewsets.ModelViewSet): # <-- This one is special
    queryset = Shop.objects.all()
    serializer_class = ShopSerializer
    permission_classes = (permissions.IsAuthenticated,)

    # Override get_queryset to only return the user's OWN shop
    def get_queryset(self):
        user = self.request.user
        if user.is_authenticated and hasattr(user, 'shop') and user.shop is not None:
            return Shop.objects.filter(id=user.shop.id)
        return Shop.objects.none()

# ---------- Current User (FIXED) ----------
class MeViewSet(viewsets.ViewSet):
    permission_classes = (permissions.IsAuthenticated,)

    def list(self, request):
        user = request.user
        user_data = UserSerializer(user).data # Get user details
        
        shop_data = None
        if user.shop:
            # Get shop details if they exist
            shop_data = ShopSerializer(user.shop).data
        
        return Response({
            "user": user_data,
            "shop": shop_data  # <-- Send shop data to frontend
        })

# ---------- Payment & Subscription Views ----------
RAZORPAY_KEY_ID = settings.RAZORPAY_KEY_ID
RAZORPAY_KEY_SECRET = settings.RAZORPAY_KEY_SECRET

razorpay_client = razorpay.Client(auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET))


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_order(request):
    """User selects a plan → Create Razorpay order"""
    plan_id = request.data.get("plan_id")
    try:
        plan = SubscriptionPlan.objects.get(id=plan_id)
    except SubscriptionPlan.DoesNotExist:
        return Response({"error": "Plan not found"}, status=status.HTTP_404_NOT_FOUND)

    amount_paise = int(plan.price * 100)

    order = razorpay_client.order.create({
        "amount": amount_paise,
        "currency": "INR",
        "payment_capture": 1
    })

    payment = Payment.objects.create(
        user=request.user,
        plan=plan,
        order_id=order["id"],
        amount=plan.price,
        status="created"
    )

    return Response({
        "order_id": order["id"],
        "amount": amount_paise,
        "currency": "INR",
        "key": RAZORPAY_KEY_ID
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def check_subscription(request):
    """Check if user subscription is valid"""
    subscription, created = UserSubscription.objects.get_or_create(user=request.user)
    if created:
        subscription.start_trial()  # start trial for new users

    return Response({
        "is_valid": subscription.is_valid(),
        "expiry_date": subscription.expiry_date,
        "admin_override": subscription.admin_override,
    })


# ---------- Forgot Password ----------
from rest_framework.views import APIView

class ForgotPasswordView(APIView):
    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        email = request.data.get("email")
        if not email:
            return Response({"error": "Email is required."}, status=400)

        # --- FIX: Use email__iexact for case-insensitive search ---
        user = User.objects.filter(email__iexact=email).first()
        if not user:
             # Do not reveal if user exists
            return Response({"message": "If an account with this email exists, a reset link has been sent."})

        token = PasswordResetTokenGenerator().make_token(user)
        uidb64 = urlsafe_base64_encode(force_bytes(user.pk))
        # --- FIX: Use env variable for frontend URL ---
        frontend_url = settings.FRONTEND_URL or "http://localhost:5173"
        reset_url = f"{frontend_url}/reset-password/{uidb64}/{token}"

        send_password_reset_email(email, reset_url)
        return Response({"message": "Password reset link sent to your email."})
    

# ---------- Reset Password ----------
class ResetPasswordView(APIView):
    permission_classes = (permissions.AllowAny,)

    def post(self, request, uidb64, token):
        try:
            uid = force_str(urlsafe_base64_decode(uidb64))
            user = get_object_or_404(User, pk=uid)
        except Exception:
            return Response({"error": "Invalid link."}, status=400)

        if not PasswordResetTokenGenerator().check_token(user, token):
            return Response({"error": "Invalid or expired token."}, status=400)

        password = request.data.get("password")
        password2 = request.data.get("password2")

        if not password or not password2:
            return Response({"error": "Password fields are required."}, status=400)

        if password != password2:
            return Response({"error": "Passwords do not match."}, status=400)

        user.set_password(password)
        user.save()
        return Response({"message": "Password reset successful."}, status=200)