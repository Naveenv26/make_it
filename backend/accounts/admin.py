# backend/accounts/admin.py
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User
from api.models import UserSubscription # Import from the 'api' app

# 1. Define an Inline admin for the UserSubscription
# This will show the subscription details *inside* the User page
class UserSubscriptionInline(admin.StackedInline):
    model = UserSubscription
    can_delete = False
    verbose_name_plural = 'Subscription'
    fk_name = 'user'
    
    # These are the fields you can directly edit from the User's page
    fields = ('plan', 'active', 'allowed_by_admin', 'end_date', 'trial_used', 'trial_end_date')
    readonly_fields = ('trial_end_date',) # Make trial end date read-only

# 2. Define a new UserAdmin
@admin.register(User)
class UserAdmin(BaseUserAdmin):
    # Add the subscription inline
    inlines = (UserSubscriptionInline,)
    
    # Show 'role' and 'shop' in the main user list
    list_display = ('email', 'username', 'shop', 'role', 'is_staff', 'is_active')
    list_filter = ('role', 'is_staff', 'is_active', 'shop')
    
    # Configure the fields shown in the user's detail page
    fieldsets = (
        (None, {'fields': ('email', 'password')}),
        ('Personal Info', {'fields': ('first_name', 'last_name', 'username')}),
        # Add our custom fields
        ('App-Specific', {'fields': ('role', 'shop')}), 
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Important dates', {'fields': ('last_login', 'date_joined')}),
    )
    search_fields = ('email', 'username', 'shop__name')
    ordering = ('email',)

# We no longer need the old loop, this is much better.