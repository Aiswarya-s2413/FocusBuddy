from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.core.cache import cache
import logging
from userapp.models import User, Mentor, MentorApprovalRequest, FocusBuddySession, MentorSession

logger = logging.getLogger(__name__)

# Cache keys (must match your view)
METRICS_CACHE_KEY = "admin_dashboard_metrics"
USAGE_CACHE_KEY_PREFIX = "admin_dashboard_usage"

@receiver([post_save, post_delete], sender=User)
def invalidate_user_cache(sender, **kwargs):
    """Clear metrics cache when user data changes"""
    cache.delete(METRICS_CACHE_KEY)
    logger.info("Cleared metrics cache due to User change")

@receiver([post_save, post_delete], sender=Mentor)
def invalidate_mentor_cache(sender, **kwargs):
    """Clear metrics cache when mentor data changes"""
    cache.delete(METRICS_CACHE_KEY)
    logger.info("Cleared metrics cache due to Mentor change")

@receiver([post_save, post_delete], sender=MentorApprovalRequest)
def invalidate_approval_cache(sender, **kwargs):
    """Clear metrics cache when approval requests change"""
    cache.delete(METRICS_CACHE_KEY)
    logger.info("Cleared metrics cache due to MentorApprovalRequest change")

@receiver([post_save, post_delete], sender=FocusBuddySession)
def invalidate_focus_session_cache(sender, **kwargs):
    """Clear both metrics and usage cache when focus sessions change"""
    cache.delete(METRICS_CACHE_KEY)
    cache.delete(f"{USAGE_CACHE_KEY_PREFIX}_daily")
    cache.delete(f"{USAGE_CACHE_KEY_PREFIX}_weekly")
    logger.info("Cleared session caches due to FocusBuddySession change")

@receiver([post_save, post_delete], sender=MentorSession)
def invalidate_mentor_session_cache(sender, **kwargs):
    """Clear both metrics and usage cache when mentor sessions change"""
    cache.delete(METRICS_CACHE_KEY)
    cache.delete(f"{USAGE_CACHE_KEY_PREFIX}_daily")
    cache.delete(f"{USAGE_CACHE_KEY_PREFIX}_weekly")
    logger.info("Cleared session caches due to MentorSession change")
