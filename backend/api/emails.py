# backend/api/emails.py
from django.core.mail import send_mail
from django.conf import settings

def send_password_reset_email(email, reset_url):
    subject = "Password Reset Request"
    message = f"""
Hi,

We received a request to reset your password.
Please click the link below to reset your password:

{reset_url}

If you didn't request this, you can ignore this email.

Thanks,
Your Billing App Team
"""
    send_mail(
        subject,
        message,
        settings.DEFAULT_FROM_EMAIL,
        [email],
        fail_silently=False,
    )
