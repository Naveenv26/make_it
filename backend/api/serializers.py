# backend/api/serializers.py
import re
# --- FIX: Import get_user_model ---
from django.contrib.auth import get_user_model 
from django.db import transaction
from rest_framework import serializers
from .models import SubscriptionPlan, UserSubscription, Payment, Expense
from shops.models import TaxProfile

from catalog.models import Product
from customers.models import Customer
from sales.models import Invoice, InvoiceItem
from shops.models import Shop

# --- FIX: Get the correct User model ---
User = get_user_model()


# --- NEW: Add this UserSerializer ---
class UserSerializer(serializers.ModelSerializer):
    """
    Serializer for the Custom User model (for /api/me/ endpoint).
    """
    class Meta:
        model = User
        # Include fields you want to send to the frontend
        fields = ("id", "username", "email", "role", "shop") 
        read_only_fields = ("id", "role", "shop")


# ---------- Register serializer ----------
class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    password2 = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = User  # <-- This now correctly points to your custom User
        fields = ("id", "username", "email", "password", "password2", "first_name", "last_name")
        # Note: Your custom User model uses email as USERNAME_FIELD
        # This serializer might conflict with your ShopRegistrationSerializer
        # and should be reviewed. But it's fixed to use the right model.

    # ... (rest of your validation logic for RegisterSerializer) ...
    def validate_username(self, value):
        if len(value) < 4:
            raise serializers.ValidationError("Username must be at least 4 characters long.")
        if not re.match(r"^[A-Za-z0-9_]+$", value):
            raise serializers.ValidationError("Username may contain only letters, numbers and underscore.")
        return value

    def validate_password(self, value):
        if len(value) < 8:
            raise serializers.ValidationError("Password must be at least 8 characters long.")
        if not re.search(r"\d", value):
            raise serializers.ValidationError("Password must contain at least one number.")
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>_\-\[\]\\\/]", value):
            raise serializers.ValidationError("Password must contain at least one special symbol.")
        return value

    def validate(self, attrs):
        pw = attrs.get("password")
        pw2 = attrs.get("password2") or attrs.get("password")
        if pw != pw2:
            raise serializers.ValidationError({"password": "Password fields didn't match."})
        return attrs

    def create(self, validated_data):
        validated_data.pop("password2", None)
        password = validated_data.pop("password")
        
        # --- FIX: Use email for username if username is not provided ---
        # Your custom model requires email, but this serializer uses username.
        # This is a temporary patch. You should align your serializers.
        email = validated_data.get("email", "")
        username = validated_data.get("username", email) # Use email as username if not given

        user = User(
            username=username,
            email=email,
            first_name=validated_data.get("first_name", ""),
            last_name=validated_data.get("last_name", ""),
        )
        user.set_password(password)
        user.save()
        return user


# ---------- Model serializers ----------
class ShopSerializer(serializers.ModelSerializer):
    class Meta:
        model = Shop
        fields = "__all__"
        read_only_fields = ("id",)


class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = "__all__"
        # --- THIS IS THE FIX ---
        # Add "shop" to this tuple
        read_only_fields = ("id", "shop")

    def validate_price(self, value):
        if value < 0:
            raise serializers.ValidationError("Price must be non-negative.")
        return value

    def validate_quantity(self, value):
        if value < 0:
            raise serializers.ValidationError("Quantity must be non-negative.")
        return value

class CustomerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = "__all__"
        read_only_fields = ("id",)


class InvoiceItemSerializer(serializers.ModelSerializer):
    # ... (Keep this serializer as it was) ...
    product_name = serializers.CharField(source='product.name', read_only=True)
    class Meta:
        model = InvoiceItem
        fields = ("id", "product", "product_name", "qty", "unit_price", "tax_rate")
        read_only_fields = ("id", "product_name")

class InvoiceSerializer(serializers.ModelSerializer):
    items = InvoiceItemSerializer(many=True)
    customer_name = serializers.CharField(allow_blank=True, required=False, write_only=True)
    customer_mobile = serializers.CharField(allow_blank=True, required=False, write_only=True)
    customer_detail = CustomerSerializer(source="customer", read_only=True)

    class Meta:
        model = Invoice
        fields = (
            "id", "shop", "customer", "customer_detail", "customer_name", "customer_mobile",
            "created_at", "total_amount", "subtotal", "tax_total", "grand_total", "status", "items",
            "invoice_date", "number"
        )
        read_only_fields = (
            "id", "shop", "customer", "created_at", "total_amount", "subtotal",
            "tax_total", "grand_total", "customer_detail", "invoice_date", "number"
        )

    @transaction.atomic
    def create(self, validated_data):
        items_data = validated_data.pop("items", [])
        request = self.context.get('request')
        if not request or not hasattr(request.user, 'shop'):
             raise serializers.ValidationError("Could not determine the shop for this request.")
        shop = request.user.shop

        customer_name = validated_data.pop("customer_name", "Walk-in")
        customer_mobile = validated_data.pop("customer_mobile", None)

        customer = None
        if customer_mobile:
            customer, created = Customer.objects.get_or_create(
                shop=shop,
                mobile=customer_mobile,
                defaults={'name': customer_name}
            )

        # --- GENERATE UNIQUE INVOICE NUMBER ---
        last_invoice = Invoice.objects.filter(shop=shop).order_by('-number').first()
        if last_invoice and last_invoice.number:
             # Try converting number to int, handle potential non-numeric values
             try:
                 next_number = int(last_invoice.number) + 1
             except (ValueError, TypeError):
                 # Fallback if number isn't an integer string
                 # You might want a more robust sequence generator here
                 next_number = (last_invoice.id or 0) + 1 
        else:
             next_number = 1 # Start from 1 if no invoices exist

        # Format the number (optional, e.g., padding with zeros)
        # formatted_number = f"{next_number:05d}" # Example: 00001
        formatted_number = str(next_number) # Simple string conversion
        # ----------------------------------------

        invoice = Invoice.objects.create(
            shop=shop,
            customer=customer,
            customer_name=customer_name,
            customer_mobile=customer_mobile,
            status="PAID",
            number=formatted_number # <-- Assign the generated number
        )

        total_amount = 0
        subtotal = 0
        tax_total = 0

        for item_data in items_data:
            prod = item_data['product']
            qty = item_data['qty']
            price = item_data['unit_price']
            tax_rate = item_data.get('tax_rate', 0)

            line_subtotal = price * qty
            line_tax = (line_subtotal * tax_rate) / 100
            line_total = line_subtotal + line_tax

            subtotal += line_subtotal
            tax_total += line_tax
            total_amount += line_total

            InvoiceItem.objects.create(
                invoice=invoice,
                product=prod,
                qty=qty,
                unit_price=price,
                tax_rate=tax_rate,
                line_total=line_total
            )

            from django.db.models import F
            prod.refresh_from_db()
            prod.quantity = F('quantity') - qty
            prod.save()

        invoice.subtotal = subtotal
        invoice.tax_total = tax_total
        invoice.grand_total = total_amount
        invoice.total_amount = total_amount
        invoice.save()

        return invoice
    
   

class TaxProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaxProfile
        fields = "__all__"
        read_only_fields = ("id",)


# ... (rest of your serializers: SubscriptionPlanSerializer, UserSubscriptionSerializer, etc.) ...
class SubscriptionPlanSerializer(serializers.ModelSerializer):
    plan_type_display = serializers.CharField(source='get_plan_type_display', read_only=True)
    duration_display = serializers.CharField(source='get_duration_display', read_only=True)
    
    class Meta:
        model = SubscriptionPlan
        fields = [
            'id', 'name', 'plan_type', 'plan_type_display',
            'duration', 'duration_display', 'price', 'duration_days',
            'features', 'is_active', 'created_at'
        ]


# ========== USER SUBSCRIPTION SERIALIZER ==========
class UserSubscriptionSerializer(serializers.ModelSerializer):
    plan_details = SubscriptionPlanSerializer(source='plan', read_only=True)
    plan_type = serializers.SerializerMethodField()
    days_remaining = serializers.SerializerMethodField()
    is_trial = serializers.SerializerMethodField()
    
    class Meta:
        model = UserSubscription
        fields = [
            'id', 'plan', 'plan_details', 'plan_type',
            'trial_used', 'trial_end_date', 'start_date', 'end_date',
            'active', 'allowed_by_admin', 'grace_period_end',
            'days_remaining', 'is_trial', 'created_at'
        ]
    
    def get_plan_type(self, obj):
        return obj.get_plan_type()
    
    def get_days_remaining(self, obj):
        from django.utils import timezone
        if obj.is_trial_active():
            delta = obj.trial_end_date - timezone.now()
            return max(0, delta.days)
        if obj.end_date:
            delta = obj.end_date - timezone.now()
            return max(0, delta.days)
        return 0
    
    def get_is_trial(self, obj):
        return obj.is_trial_active()


# ========== PAYMENT SERIALIZER ==========
class PaymentSerializer(serializers.ModelSerializer):
    plan_details = SubscriptionPlanSerializer(source='plan', read_only=True)
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_name = serializers.CharField(source='user.username', read_only=True)
    
    class Meta:
        model = Payment
        fields = [
            'id', 'user', 'user_email', 'user_name',
            'plan', 'plan_details', 'order_id', 'payment_id',
            'amount', 'currency', 'status', 'created_at', 'updated_at'
        ]
        read_only_fields = ['order_id', 'payment_id', 'status']


# ========== CREATE ORDER SERIALIZER ==========
class CreateOrderSerializer(serializers.Serializer):
    plan_id = serializers.IntegerField()
    
    def validate_plan_id(self, value):
        try:
            plan = SubscriptionPlan.objects.get(id=value, is_active=True)
            return value
        except SubscriptionPlan.DoesNotExist:
            raise serializers.ValidationError("Invalid or inactive plan.")


# ========== VERIFY PAYMENT SERIALIZER ==========
class VerifyPaymentSerializer(serializers.Serializer):
    razorpay_order_id = serializers.CharField()
    razorpay_payment_id = serializers.CharField()
    razorpay_signature = serializers.CharField()


# ========== EXPENSE SERIALIZER (PRO FEATURE) ==========
class ExpenseSerializer(serializers.ModelSerializer):
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    created_by_name = serializers.CharField(source='created_by.username', read_only=True)
    
    class Meta:
        model = Expense
        fields = [
            'id', 'shop', 'category', 'category_display',
            'amount', 'description', 'date', 'receipt_number',
            'vendor_name', 'created_by', 'created_by_name', 'created_at'
        ]
        read_only_fields = ['created_by', 'created_at']