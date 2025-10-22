from rest_framework import serializers
from .models import Shop, SubscriptionPlan, TaxProfile
from accounts.models import User
from django.contrib.auth.hashers import make_password

# SubscriptionPlan Serializer
class SubscriptionPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = SubscriptionPlan
        fields = "__all__"

# Shop Serializer
class ShopSerializer(serializers.ModelSerializer):
    active_subscription = SubscriptionPlanSerializer(read_only=True)
    active_subscription_id = serializers.PrimaryKeyRelatedField(
        source="active_subscription",
        queryset=SubscriptionPlan.objects.all(),
        write_only=True,
        required=False,
    )

    class Meta:
        model = Shop
        fields = "__all__"

# Admin Shop Serializer
class AdminShopSerializer(serializers.ModelSerializer):
    active_subscription = SubscriptionPlanSerializer(read_only=True)
    active_subscription_id = serializers.PrimaryKeyRelatedField(
        source="active_subscription",
        queryset=SubscriptionPlan.objects.all(),
        write_only=True,
        required=False,
    )

    class Meta:
        model = Shop
        fields = "__all__"

# TaxProfile Serializer
class TaxProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaxProfile
        fields = "__all__"

# ✅ Corrected Custom Registration Serializer
class ShopRegistrationSerializer(serializers.Serializer):
    # Shop fields
    name = serializers.CharField(max_length=120)
    address = serializers.CharField(required=False, allow_blank=True)
    contact_phone = serializers.CharField(required=False, allow_blank=True)
    contact_email = serializers.EmailField(required=False, allow_blank=True)
    language = serializers.CharField(default="en")

    # Owner fields
    owner_username = serializers.CharField(max_length=150)
    owner_password = serializers.CharField(write_only=True, min_length=8)

    # Optional shopkeeper
    create_shopkeeper = serializers.BooleanField(default=False)
    shopkeeper_password = serializers.CharField(required=False, write_only=True)

    def validate_owner_username(self, value):
        """
        Check that the username is not already in use.
        """
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("A user with this username already exists.")
        return value
    
    def validate(self, data):
        """
        Check that shopkeeper_password is provided if create_shopkeeper is True.
        """
        if data.get('create_shopkeeper') and not data.get('shopkeeper_password'):
            raise serializers.ValidationError({"shopkeeper_password": "This field is required when creating a shopkeeper."})
        return data

    def create(self, validated_data):
        # Create shop
        shop = Shop.objects.create(
            name=validated_data["name"],
            address=validated_data.get("address", ""),
            contact_phone=validated_data.get("contact_phone", ""),
            contact_email=validated_data.get("contact_email", ""),
            language=validated_data.get("language", "en"),
        )

        # Create owner
        owner = User.objects.create(
            username=validated_data["owner_username"],
            password=make_password(validated_data["owner_password"]),
            role="SHOP_OWNER",
            shop=shop,
        )

        # Optional shopkeeper
        if validated_data.get("create_shopkeeper"):
            shopkeeper_password = validated_data.get("shopkeeper_password")
            User.objects.create(
                username=f"{validated_data['owner_username']}_keeper",
                password=make_password(shopkeeper_password),
                role="SHOP_KEEPER",
                shop=shop,
            )

        return shop