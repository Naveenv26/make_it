# backend/api/serializers.py
import re
from django.contrib.auth.models import User
from rest_framework import serializers
from .models import SubscriptionPlan, UserSubscription, Payment, Expense
from shops.models import TaxProfile


# THIS IS THE FIX
from catalog.models import Product
from customers.models import Customer
from sales.models import Invoice, InvoiceItem
from shops.models import Shop


# ---------- Register serializer ----------
class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    password2 = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = User
        fields = ("id", "username", "email", "password", "password2", "first_name", "last_name")

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
        user = User(
            username=validated_data.get("username"),
            email=validated_data.get("email", ""),
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
        read_only_fields = ("id",)

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
    product_detail = ProductSerializer(source="product", read_only=True)

    # THIS IS THE FIX
    class Meta:
        model = InvoiceItem
        fields = ("id", "product", "product_detail", "qty", "unit_price")

class InvoiceSerializer(serializers.ModelSerializer):
    items = InvoiceItemSerializer(many=True)

    class Meta:
        model = Invoice
        fields = ("id", "shop", "customer", "created_at", "total_amount", "status", "items")
        read_only_fields = ("id", "created_at", "total_amount")

    def create(self, validated_data):
        items_data = validated_data.pop("items", [])
        invoice = Invoice.objects.create(**validated_data)
        for item_data in items_data:
            InvoiceItem.objects.create(invoice=invoice, **item_data)
        invoice.calculate_total()
        return invoice

    def update(self, instance, validated_data):
        items_data = validated_data.pop("items", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if items_data is not None:
            instance.items.all().delete()
            for item_data in items_data:
                InvoiceItem.objects.create(invoice=instance, **item_data)
        instance.calculate_total()
        return instance


class TaxProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaxProfile
        fields = "__all__"
        read_only_fields = ("id",)


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