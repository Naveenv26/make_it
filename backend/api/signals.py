# backend/api/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone
from datetime import timedelta
from django.contrib.auth.models import User
from .models import UserSubscription

@receiver(post_save, sender=User)
def create_free_trial(sender, instance, created, **kwargs):
    if created:
        UserSubscription.objects.create(
            user=instance,
            end_date=timezone.now() + timedelta(days=7),  # 7 days free trial
            active=True
        )
