# backend/accounts/models.py

from django.contrib.auth.models import AbstractUser, UserManager
from django.db import models

class CustomUserManager(UserManager):
    def get_by_natural_key(self, username):
        # Allow login with case-insensitive email
        return self.get(email__iexact=username)

class User(AbstractUser):
    class Role(models.TextChoices):
        SITE_ADMIN = 'SITE_ADMIN', 'Site Admin'
        SHOP_OWNER = 'SHOP_OWNER', 'Shop Owner'
        SHOPKEEPER = 'SHOPKEEPER', 'Shop Keeper'

    # Make email unique and the primary identifier
    email = models.EmailField(unique=True, blank=False, null=False)
    
    # Make username optional and not unique
    username = models.CharField(
        max_length=150,
        unique=False,
        null=True,
        blank=True
    )

    role = models.CharField(max_length=20, choices=Role.choices, default=Role.SHOPKEEPER)
    shop = models.ForeignKey('shops.Shop', null=True, blank=True, on_delete=models.SET_NULL, related_name='users')

    # Set email as the field used for login
    USERNAME_FIELD = 'email'
    
    # 'email' is now the USERNAME_FIELD, so it's not needed here
    REQUIRED_FIELDS = ['username'] # Keep username required for createsuperuser

    objects = CustomUserManager() # Use the custom manager

    def __str__(self):
        return f"{self.email} ({self.role})"