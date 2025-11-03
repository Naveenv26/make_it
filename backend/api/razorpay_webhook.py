# backend/api/razorpay_webhook.py
import razorpay
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
import json
from .models import Payment, UserSubscription
from django.conf import settings # <-- Import settings

# --- FIX: Load secret from settings (which reads from .env) ---
RAZORPAY_KEY_SECRET = settings.RAZORPAY_KEY_SECRET

@csrf_exempt
def razorpay_webhook(request):
    data = json.loads(request.body.decode("utf-8"))
    signature = request.headers.get("X-Razorpay-Signature")

    try:
        # --- This will now use your real secret key ---
        razorpay.Utility.verify_webhook_signature(request.body, signature, RAZORPAY_KEY_SECRET)
    except:
        return JsonResponse({"error": "Invalid signature"}, status=400)

    event = data.get("event")
    if event == "payment.captured":
        entity = data["payload"]["payment"]["entity"]
        order_id = entity["order_id"]
        payment_id = entity["id"]

        try:
            payment = Payment.objects.get(order_id=order_id)
            payment.payment_id = payment_id
            payment.status = "paid"
            payment.save()

            # Activate plan
            subscription, _ = UserSubscription.objects.get_or_create(user=payment.user)
            if not subscription.admin_override:  # respect admin override
                subscription.activate_plan(payment.plan)

        except Payment.DoesNotExist:
            return JsonResponse({"error": "Payment not found"}, status=404)

    return JsonResponse({"status": "success"})