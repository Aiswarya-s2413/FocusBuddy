from django.db.models.signals import post_save
from django.dispatch import receiver
from django.core.mail import send_mail
from django.conf import settings
from django.contrib.auth.models import User
from django.utils import timezone
from .models import Mentor, MentorApprovalRequest

@receiver(post_save, sender=Mentor)
def mentor_profile_updated(sender, instance, created, **kwargs):
    """
    Signal triggered when Mentor profile is saved
    Sends approval request to admin when profile is complete
    """
    
    # Check if this is a profile completion (has required fields)
    if instance.profile_image and instance.bio and not instance.submitted_for_approval:
        
        # Mark as submitted for approval
        instance.submitted_for_approval = True
        instance.submitted_at = timezone.now()
        instance.approval_status = 'pending'
        
        # Save without triggering signal again
        Mentor.objects.filter(id=instance.id).update(
            submitted_for_approval=True,
            submitted_at=timezone.now(),
            approval_status='pending'
        )
        
        # Create approval request record
        approval_request = MentorApprovalRequest.objects.create(
            mentor=instance,
            status='pending'
        )
        
        # Send notification to admins
        send_admin_approval_notification(instance, approval_request)
        
        print(f"✅ Approval request created for mentor: {instance.user.name}")