# in accounts/serializers.py

from rest_framework import serializers
from django.contrib.auth import get_user_model
from shops.models import Shop
from django.db import transaction

User = get_user_model()

# --- Nested Serializers for Validation ---

class NestedShopSerializer(serializers.ModelSerializer):
    """
    Validates the shop data.
    """
    class Meta:
        model = Shop
        # List all fields from the Shop model that you want to accept during registration
        fields = ['name', 'address', 'contact_phone', 'contact_email', 'language']

class NestedUserCreationSerializer(serializers.ModelSerializer):
    """
    Validates the user data (for owner and shopkeeper).
    """
    class Meta:
        model = User
        fields = ['username', 'password', 'email']
        extra_kwargs = {
            'password': {'write_only': True} # Ensures password isn't sent back in responses
        }

# --- Main Registration Serializer ---

class ShopRegistrationSerializer(serializers.Serializer):
    """
    Orchestrates the registration process using nested serializers for robust validation.
    """
    shop = NestedShopSerializer()
    owner = NestedUserCreationSerializer()
    create_shopkeeper = serializers.BooleanField(default=False)
    shopkeeper = NestedUserCreationSerializer(required=False)

    def validate(self, data):
        """
        Custom validation to check for unique usernames.
        """
        if User.objects.filter(username=data['owner']['username']).exists():
            raise serializers.ValidationError({'owner': 'An owner with this username already exists.'})
        
        if data.get('create_shopkeeper') and data.get('shopkeeper'):
            if User.objects.filter(username=data['shopkeeper']['username']).exists():
                raise serializers.ValidationError({'shopkeeper': 'A shopkeeper with this username already exists.'})
        return data

    @transaction.atomic # Ensures all database operations succeed or none do
    def create(self, validated_data):
        shop_data = validated_data.pop("shop")
        owner_data = validated_data.pop("owner")
        create_shopkeeper = validated_data.pop("create_shopkeeper")
        shopkeeper_data = validated_data.pop("shopkeeper", None)

        # 1. Create Shop
        shop = Shop.objects.create(**shop_data)

        # 2. Create Owner User
        owner = User.objects.create_user(
            **owner_data,
            role=User.Role.SHOP_OWNER,
            shop=shop
        )

        # 3. Create Shopkeeper if requested
        shopkeeper = None
        if create_shopkeeper and shopkeeper_data:
            shopkeeper = User.objects.create_user(
                **shopkeeper_data,
                role=User.Role.SHOPKEEPER,
                shop=shop
            )

        return {
            "shop": shop,
            "owner": owner,
            "shopkeeper": shopkeeper,
        }