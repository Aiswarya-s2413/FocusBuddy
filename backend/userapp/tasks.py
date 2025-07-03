from celery import shared_task
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
from datetime import timedelta, datetime
from .models import MentorSession

@shared_task
def send_session_reminders():
    """
    Check for sessions starting in 15 minutes and send reminder emails
    """
    now = timezone.now()
    reminder_time = now + timedelta(minutes=15)
    
    # Find sessions that start in approximately 15 minutes
    # Using a 2-minute window to account for the task running every minute
    start_window = reminder_time - timedelta(minutes=1)
    end_window = reminder_time + timedelta(minutes=1)
    
    upcoming_sessions = MentorSession.objects.filter(
        status='confirmed',
        scheduled_date=reminder_time.date(),
        scheduled_time__range=(start_window.time(), end_window.time())
    ).select_related('student', 'mentor__user')
    
    for session in upcoming_sessions:
        # Check if reminder already sent (to avoid duplicate emails)
        if not hasattr(session, 'notification_sent') or not session.notification_sent:
            send_session_reminder_email.delay(session.id)

@shared_task
def send_session_reminder_email(session_id):
    """
    Send reminder email for a specific session
    """
    try:
        session = MentorSession.objects.select_related(
            'student', 'mentor__user'
        ).get(id=session_id)
        
        # Send email to student
        send_mail(
            subject=f'Session Reminder - Starting in 15 minutes',
            message=f'''
            Hi {session.student.name},
            
            This is a reminder that your mentoring session with {session.mentor.user.name} 
            is starting in 15 minutes.
            
            Session Details:
            - Date: {session.scheduled_date}
            - Time: {session.scheduled_time}
            - Duration: {session.duration_minutes} minutes
            - Mode: {session.get_session_mode_display()}
            
            Please join on time. Looking forward to your session!
            
            Best regards,
            Your Mentoring Platform Team
            ''',
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[session.student.email],
            fail_silently=False,
        )
        
        # Send email to mentor
        send_mail(
            subject=f'Session Reminder - Starting in 15 minutes',
            message=f'''
            Hi {session.mentor.user.name},
            
            This is a reminder that your mentoring session with {session.student.name} 
            is starting in 15 minutes.
            
            Session Details:
            - Date: {session.scheduled_date}
            - Time: {session.scheduled_time}
            - Duration: {session.duration_minutes} minutes
            - Mode: {session.get_session_mode_display()}
            
            Please join on time. Your student is counting on you!
            
            Best regards,
            Your Mentoring Platform Team
            ''',
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[session.mentor.user.email],
            fail_silently=False,
        )
        
        print(f"Reminder emails sent for session {session_id}")
        return f"Reminder emails sent successfully for session {session_id}"
        
    except MentorSession.DoesNotExist:
        print(f"Session {session_id} not found")
        return f"Session {session_id} not found"
    except Exception as e:
        print(f"Error sending reminder for session {session_id}: {str(e)}")
        return f"Error: {str(e)}"