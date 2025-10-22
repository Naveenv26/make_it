from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    class Role(models.TextChoices):
        SITE_ADMIN = 'SITE_ADMIN', 'Site Admin'   # 👈 global admin
        SHOP_OWNER = 'SHOP_OWNER', 'Shop Owner'
        SHOPKEEPER = 'SHOPKEEPER', 'Shop Keeper'

    role = models.CharField(max_length=20, choices=Role.choices, default=Role.SHOPKEEPER)
    shop = models.ForeignKey('shops.Shop', null=True, blank=True, on_delete=models.SET_NULL, related_name='users')

    def __str__(self):
        return f"{self.username} ({self.role})"
