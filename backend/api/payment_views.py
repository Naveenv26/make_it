# backend/api/payment_views.py

import razorpay
import hmac
import hashlib
from django.conf import settings
from rest_framework import status, viewsets
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated
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

# Initialize Razorpay client
razorpay_client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))


# ========== SUBSCRIPTION PLANS VIEWSET ==========
class SubscriptionPlanViewSet(viewsets.ReadOnlyModelViewSet):
    """
    GET /api/subscription-plans/ - List all active plans
    GET /api/subscription-plans/{id}/ - Get single plan
    """
    queryset = SubscriptionPlan.objects.filter(is_active=True)
    serializer_class = SubscriptionPlanSerializer
    permission_classes = [IsAuthenticated]


# ========== CREATE RAZORPAY ORDER ==========
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_order(request):
    """
    POST /api/payments/create-order/
    Body: { "plan_id": 1 }
    
    Creates a Razorpay order and returns order details
    """
    serializer = CreateOrderSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    
    plan_id = serializer.validated_data['plan_id']
    
    try:
        plan = SubscriptionPlan.objects.get(id=plan_id, is_active=True)
    except SubscriptionPlan.DoesNotExist:
        return Response(
            {"error": "Plan not found or inactive"},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Convert price to paise (Razorpay expects amount in smallest currency unit)
    amount_paise = int(float(plan.price) * 100)
    
    # Create Razorpay order
    try:
        razorpay_order = razorpay_client.order.create({
            "amount": amount_paise,
            "currency": "INR",
            "payment_capture": 1,  # Auto capture payment
            "notes": {
                "user_id": request.user.id,
                "plan_id": plan.id,
                "plan_name": plan.name
            }
        })
    except Exception as e:
        return Response(
            {"error": f"Failed to create Razorpay order: {str(e)}"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    
    # Create payment record in database
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
        "payment_id": payment.id
    }, status=status.HTTP_201_CREATED)


# ========== VERIFY PAYMENT & ACTIVATE SUBSCRIPTION ==========
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def verify_payment(request):
    """
    POST /api/payments/verify-payment/
    Body: {
        "razorpay_order_id": "order_xxx",
        "razorpay_payment_id": "pay_xxx",
        "razorpay_signature": "signature_xxx"
    }
    
    Verifies payment signature and activates subscription
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
            {"error": "Payment record not found"},
            status=status.HTTP_404_NOT_FOUND
        )
    
    # Update payment status
    with transaction.atomic():
        payment.payment_id = razorpay_payment_id
        payment.signature = razorpay_signature
        payment.status = 'SUCCESS'
        payment.save()
        
        # Get or create user subscription
        subscription, created = UserSubscription.objects.get_or_create(
            user=request.user
        )
        
        # Activate subscription
        subscription.activate_plan(payment.plan)
    
    return Response({
        "success": True,
        "message": "Payment verified and subscription activated!",
        "subscription": UserSubscriptionSerializer(subscription).data
    }, status=status.HTTP_200_OK)


# ========== GET USER SUBSCRIPTION STATUS ==========
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def subscription_status(request):
    """
    GET /api/payments/subscription-status/
    
    Returns current user's subscription details
    """
    try:
        subscription = UserSubscription.objects.get(user=request.user)
    except UserSubscription.DoesNotExist:
        # Auto-create subscription with trial
        subscription = UserSubscription.objects.create(user=request.user)
        subscription.start_trial()
    
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
    """
    POST /api/payments/start-trial/
    
    Starts 7-day free trial for new users
    """
    subscription, created = UserSubscription.objects.get_or_create(
        user=request.user
    )
    
    if subscription.trial_used:
        return Response(
            {"error": "Trial already used for this account"},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    success = subscription.start_trial()
    
    if success:
        return Response({
            "success": True,
            "message": "7-day free trial activated!",
            "subscription": UserSubscriptionSerializer(subscription).data
        })
    else:
        return Response(
            {"error": "Failed to start trial"},
            status=status.HTTP_400_BAD_REQUEST
        )


# ========== PAYMENT HISTORY ==========
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def payment_history(request):
    """
    GET /api/payments/history/
    
    Returns user's payment history
    """
    payments = Payment.objects.filter(user=request.user)
    serializer = PaymentSerializer(payments, many=True)
    return Response(serializer.data)


# ========== RAZORPAY WEBHOOK (for server-to-server notifications) ==========
from django.views.decorators.csrf import csrf_exempt

@csrf_exempt
@api_view(['POST'])
def razorpay_webhook(request):
    """
    POST /api/payments/webhook/
    
    Handles Razorpay webhook events (payment.captured, payment.failed, etc.)
    """
    webhook_secret = settings.RAZORPAY_KEY_SECRET  # Use a separate webhook secret in production
    webhook_signature = request.headers.get('X-Razorpay-Signature', '')
    
    # Verify webhook signature
    generated_signature = hmac.new(
        webhook_secret.encode(),
        request.body,
        hashlib.sha256
    ).hexdigest()
    
    if generated_signature != webhook_signature:
        return Response({"error": "Invalid signature"}, status=400)
    
    # Process webhook event
    webhook_body = request.data
    event = webhook_body.get('event')
    
    if event == 'payment.captured':
        # Payment successful
        payment_entity = webhook_body['payload']['payment']['entity']
        order_id = payment_entity['order_id']
        payment_id = payment_entity['id']
        
        try:
            payment = Payment.objects.get(order_id=order_id)
            payment.payment_id = payment_id
            payment.status = 'SUCCESS'
            payment.save()
            
            # Activate subscription
            subscription, _ = UserSubscription.objects.get_or_create(user=payment.user)
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