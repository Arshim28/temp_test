"""Module containing helper functions for user_auth app."""

import secrets
import environ

from django.conf import settings
from django.core.mail import send_mail

env = environ.Env()
environ.Env.read_env()


def generate_otp() -> str:
    """Generate a 6 digit OTP."""
    otp = "".join([str(secrets.randbelow(10)) for _ in range(6)])
    return otp


def send_otp(recipient, otp):
    """Send OTP to the recipient's email."""
    try:
        message = (
            f"Your OTP for TerraStack signup is: {otp}\n\n"
            "Please do not share this OTP with anyone.\n"
            "If you did not request this OTP, please ignore this email."
        )

        send_mail(
            subject="Your TerraStack signup OTP",
            message=message,
            from_email=settings.SENDER_MAIL,  # Fetching from Django settings
            recipient_list=[recipient],
            fail_silently=False,
        )
        return True

    except Exception as e:
        print(f"Error sending email: {e}")
        return False
