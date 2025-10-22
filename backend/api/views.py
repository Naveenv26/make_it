# backend/api/views.py
from rest_framework import viewsets, generics, permissions
from rest_framework.response import Response
from rest_framework.decorators import action
from .serializers import (
    SubscriptionPlanSerializer, RegisterSerializer, ProductSerializer, CustomerSerializer,
    InvoiceSerializer, TaxProfileSerializer, ShopSerializer
)
from .models import SubscriptionPlan, Product, Customer, Invoice, TaxProfile, Shop
import razorpay
from django.conf import settings
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from .models import SubscriptionPlan, Payment, UserSubscription
from .serializers import PaymentSerializer, UserSubscriptionSerializer
from rest_framework.response import Response
from rest_framework import status

from django.contrib.auth import get_user_model

User = get_user_model()
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.shortcuts import get_object_or_404
from .emails import send_password_reset_email


# ---------- Registration ----------
class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = (permissions.AllowAny,)

# ---------- Subscription ----------
class SubscriptionPlanViewSet(viewsets.ModelViewSet):
    queryset = SubscriptionPlan.objects.all()
    serializer_class = SubscriptionPlanSerializer
    permission_classes = (permissions.IsAuthenticated,)

# ---------- Reports ----------
class ReportsViewSet(viewsets.ViewSet):
    permission_classes = (permissions.IsAuthenticated,)

    @action(detail=False, methods=['get'])
    def sales_summary(self, request):
        total_sales = sum(inv.total_amount for inv in Invoice.objects.all())
        total_invoices = Invoice.objects.count()
        return Response({
            "total_sales": total_sales,
            "total_invoices": total_invoices
        })

    def list(self, request):
        return Response({"detail": "Reports endpoint"})
    
# ---------- Standard CRUD ----------
class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    permission_classes = (permissions.IsAuthenticated,)


class CustomerViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.all()
    serializer_class = CustomerSerializer
    permission_classes = (permissions.IsAuthenticated,)


class InvoiceViewSet(viewsets.ModelViewSet):
    queryset = Invoice.objects.all()
    serializer_class = InvoiceSerializer
    permission_classes = (permissions.IsAuthenticated,)


class TaxProfileViewSet(viewsets.ModelViewSet):
    queryset = TaxProfile.objects.all()
    serializer_class = TaxProfileSerializer
    permission_classes = (permissions.IsAuthenticated,)


class ShopViewSet(viewsets.ModelViewSet):
    queryset = Shop.objects.all()
    serializer_class = ShopSerializer
    permission_classes = (permissions.IsAuthenticated,)

# ---------- Current User ----------
class MeViewSet(viewsets.ViewSet):
    permission_classes = (permissions.IsAuthenticated,)

    def list(self, request):
        user = request.user
        return Response({
            "id": user.id,
            "username": user.username,
            "email": user.email,
        })
RAZORPAY_KEY_ID = "rzp_test_dummy123"
RAZORPAY_KEY_SECRET = "dummy_secret"

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
from rest_framework import status

class ForgotPasswordView(APIView):
    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        email = request.data.get("email")
        if not email:
            return Response({"error": "Email is required."}, status=400)

        user = User.objects.filter(email=email).first()
        if not user:
            return Response({"error": "No account found with this email."}, status=404)

        token = PasswordResetTokenGenerator().make_token(user)
        uidb64 = urlsafe_base64_encode(force_bytes(user.pk))
        reset_url = f"http://localhost:5173/reset-password/{uidb64}/{token}"  # frontend link

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
    