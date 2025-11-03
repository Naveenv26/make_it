# backend/api/payment_views.py

import razorpay
import hmac
import hashlib
from django.conf import settings
from django.views.decorators.csrf import csrf_exempt
from rest_framework import status, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django.db import transaction

from .models import SubscriptionPlan, UserSubscription, Payment
from .serializers import (
    SubscriptionPlanSerializer,
    UserSubscriptionSerializer,
    PaymentSerializer,
    CreateOrderSerializer,
    VerifyPaymentSerializer
)

# ========== INITIALIZE RAZORPAY CLIENT ==========
razorpay_client = razorpay.Client(auth=(
    settings.RAZORPAY_KEY_ID,
    settings.RAZORPAY_KEY_SECRET
))


# ========== SUBSCRIPTION PLANS VIEWSET ==========
class SubscriptionPlanViewSet(viewsets.ReadOnlyModelViewSet):
    """List all active subscription plans"""
    queryset = SubscriptionPlan.objects.filter(is_active=True)
    serializer_class = SubscriptionPlanSerializer
    permission_classes = [IsAuthenticated]


# ========== CREATE RAZORPAY ORDER ==========
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_order(request):
    """
    Creates Razorpay order
    Body: { "plan_id": 1 }
    """
    serializer = CreateOrderSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    
    plan_id = serializer.validated_data['plan_id']
    
    try:
        plan = SubscriptionPlan.objects.get(id=plan_id, is_active=True)
    except SubscriptionPlan.DoesNotExist:
        return Response(
            {"error": "Plan not found"},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Convert to paise (Razorpay uses smallest currency unit)
    amount_paise = int(float(plan.price) * 100)
    
    try:
        # Create Razorpay order
        razorpay_order = razorpay_client.order.create({
            "amount": amount_paise,
            "currency": "INR",
            "payment_capture": 1,
            "notes": {
                "user_id": request.user.id,
                "username": request.user.username,
                "plan_id": plan.id,
                "plan_name": plan.name
            }
        })
        
        # Create payment record
        payment = Payment.objects.create(
            user=request.user,
            plan=plan,
            order_id=razorpay_order['id'],
            amount=plan.price,
            currency='INR',
            status='PENDING'
        )
        
        return Response({
            "order_id": razorpay_order['id'],
            "amount": amount_paise,
            "currency": "INR",
            "key": settings.RAZORPAY_KEY_ID,
            "plan_name": plan.name,
            "user_name": request.user.username,
            "user_email": request.user.email,
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        return Response(
            {"error": f"Failed to create order: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


# ========== VERIFY PAYMENT ==========
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def verify_payment(request):
    """
    Verifies Razorpay payment signature and activates subscription
    Body: {
        "razorpay_order_id": "order_xxx",
        "razorpay_payment_id": "pay_xxx",
        "razorpay_signature": "signature_xxx"
    }
    """
    serializer = VerifyPaymentSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    
    razorpay_order_id = serializer.validated_data['razorpay_order_id']
    razorpay_payment_id = serializer.validated_data['razorpay_payment_id']
    razorpay_signature = serializer.validated_data['razorpay_signature']
    
    # Verify signature
    generated_signature = hmac.new(
        settings.RAZORPAY_KEY_SECRET.encode(),
        f"{razorpay_order_id}|{razorpay_payment_id}".encode(),
        hashlib.sha256
    ).hexdigest()
    
    if generated_signature != razorpay_signature:
        return Response(
            {"error": "Invalid payment signature"},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Get payment record
    try:
        payment = Payment.objects.get(
            order_id=razorpay_order_id,
            user=request.user
        )
    except Payment.DoesNotExist:
        return Response(
            {"error": "Payment not found"},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Update payment & activate subscription
    with transaction.atomic():
        payment.payment_id = razorpay_payment_id
        payment.signature = razorpay_signature
        payment.status = 'SUCCESS'
        payment.save()
        
        # Get or create subscription
        subscription, created = UserSubscription.objects.get_or_create(
            user=request.user
        )
        
        # Activate plan
        subscription.activate_plan(payment.plan)
    
    return Response({
        "success": True,
        "message": "Payment verified! Subscription activated.",
        "subscription": UserSubscriptionSerializer(subscription).data
    })


# ========== SUBSCRIPTION STATUS ==========
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def subscription_status(request):
    """Returns user's subscription status"""
    try:
        subscription = UserSubscription.objects.get(user=request.user)
    except UserSubscription.DoesNotExist:
        # Create with no trial started
        subscription = UserSubscription.objects.create(user=request.user)
    
    return Response({
        "subscription": UserSubscriptionSerializer(subscription).data,
        "is_valid": subscription.is_valid(),
        "has_trial": subscription.is_trial_active(),
        "plan_type": subscription.get_plan_type(),
    })


# ========== START FREE TRIAL ==========
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def start_trial(request):
    """Start 7-day free trial"""
    subscription, created = UserSubscription.objects.get_or_create(
        user=request.user
    )
    
    if subscription.trial_used:
        return Response(
            {"error": "Trial already used"},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    success = subscription.start_trial()
    
    if success:
        return Response({
            "success": True,
            "message": "7-day trial activated!",
            "subscription": UserSubscriptionSerializer(subscription).data
        })
    
    return Response(
        {"error": "Failed to start trial"},
        status=status.HTTP_400_BAD_REQUEST
    )


# ========== PAYMENT HISTORY ==========
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def payment_history(request):
    """Get user's payment history"""
    payments = Payment.objects.filter(user=request.user)
    serializer = PaymentSerializer(payments, many=True)
    return Response(serializer.data)


# ========== RAZORPAY WEBHOOK ==========
@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
def razorpay_webhook(request):
    """
    Handles Razorpay webhook events
    Configure this URL in Razorpay Dashboard: https://yourdomain.com/api/payments/webhook/
    """
    # Get webhook secret from settings (set in Razorpay dashboard)
    webhook_secret = settings.RAZORPAY_KEY_SECRET
    webhook_signature = request.headers.get('X-Razorpay-Signature', '')
    
    # Verify webhook signature
    try:
        razorpay_client.utility.verify_webhook_signature(
            request.body.decode('utf-8'),
            webhook_signature,
            webhook_secret
        )
    except:
        return Response(
            {"error": "Invalid signature"},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Process event
    webhook_body = request.data
    event = webhook_body.get('event')
    
    if event == 'payment.captured':
        # Payment successful
        payment_entity = webhook_body['payload']['payment']['entity']
        order_id = payment_entity['order_id']
        payment_id = payment_entity['id']
        
        try:
            payment = Payment.objects.get(order_id=order_id)
            
            with transaction.atomic():
                payment.payment_id = payment_id
                payment.status = 'SUCCESS'
                payment.save()
                
                # Activate subscription
                subscription, _ = UserSubscription.objects.get_or_create(
                    user=payment.user
                )
                subscription.activate_plan(payment.plan)
            
        except Payment.DoesNotExist:
            pass
    
    elif event == 'payment.failed':
        # Payment failed
        payment_entity = webhook_body['payload']['payment']['entity']
        order_id = payment_entity['order_id']
        
        try:
            payment = Payment.objects.get(order_id=order_id)
            payment.status = 'FAILED'
            payment.save()
        except Payment.DoesNotExist:
            pass
    
    return Response({"status": "ok"})