# backend/api/admin.py
from django.contrib import admin
from .models import UserSubscription, SubscriptionPlan

@admin.register(UserSubscription)
class UserSubscriptionAdmin(admin.ModelAdmin):
    # Add more useful fields to the list
    list_display = (
        "user", 
        "plan", 
        "active", 
        "allowed_by_admin", # <-- The field you want to control
        "is_trial_active",
        "end_date", 
        "trial_used", 
        "trial_end_date"
    )
    
    # This makes 'active' and 'allowed_by_admin' clickable checkboxes in the list
    list_editable = ("active", "allowed_by_admin") 
    
    list_filter = ("active", "allowed_by_admin", "plan__plan_type", "trial_used")
    search_fields = ("user__email", "user__username", "plan__name") # Search by email or username
    
    # Make the user field a searchable popup instead of a huge dropdown
    raw_id_fields = ("user",) 

    # Add a custom method to display if trial is active
    def is_trial_active(self, obj):
        return obj.is_trial_active()
    is_trial_active.boolean = True # Show as a green check or red X

@admin.register(SubscriptionPlan)
class SubscriptionPlanAdmin(admin.ModelAdmin):
    list_display = ("name", "plan_type", "duration", "price", "duration_days", "is_active")
    list_editable = ("price", "is_active")
    list_filter = ("plan_type", "duration", "is_active")
    search_fields = ("name",)

# We don't need to register Payment or Expense here, but you could add them if you want.