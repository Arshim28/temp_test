# TODO: Add post save for CustomUser to create UserProfile

from django.db.models.signals import post_save
from .models import UserProfile, CustomUser

def create_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.create(user=instance)

post_save.connect(create_user_profile, sender=CustomUser)
