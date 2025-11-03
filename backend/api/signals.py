# backend/api/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth import get_user_model
from .models import UserSubscription, SubscriptionPlan

User = get_user_model()

@receiver(post_save, sender=User)
def create_subscription_for_new_user(sender, instance, created, **kwargs):
    if created:
        # Check if a subscription already exists (e.g., from a different signal)
        if not UserSubscription.objects.filter(user=instance).exists():
            # Create the subscription object
            subscription = UserSubscription.objects.create(user=instance)
            # Try to start the trial
            subscription.start_trial()