# userapp/tasks.py
from celery import shared_task
from django.core.mail import send_mail
from django.utils import timezone
from datetime import datetime, timedelta
import pytz
from .models import MentorSession

@shared_task
def send_session_reminders():
    """
    Send email reminders 15 minutes before scheduled sessions
    Handles IST to UTC conversion
    """
    # Get IST timezone
    ist = pytz.timezone('Asia/Kolkata')
    utc = pytz.UTC
    
    # Get current time in IST
    now_ist = timezone.now().astimezone(ist)
    
    # Calculate the time window for reminders (15 minutes from now in IST)
    reminder_time_ist = now_ist + timedelta(minutes=15)
    
    # Convert to UTC for database query
    reminder_time_utc = reminder_time_ist.astimezone(utc)
    
    # Create a time range (e.g., within 1 minute window)
    start_time = reminder_time_utc - timedelta(minutes=1)
    end_time = reminder_time_utc + timedelta(minutes=1)
    
    # Query sessions that need reminders
    sessions = MentorSession.objects.filter(
        scheduled_time__range=[start_time, end_time],
        reminder_sent=False 
    )
    
    for session in sessions:
        try:
            # Convert session time to IST for display
            session_time_ist = session.scheduled_time.astimezone(ist)
            
            # Send email
            send_mail(
                subject=f'Session Reminder - Starting in 15 minutes',
                message=f'''
                Hi {session.user.first_name},
                
                This is a reminder that your session is starting in 15 minutes.
                
                Session Time: {session_time_ist.strftime('%I:%M %p IST on %B %d, %Y')}
                
                Please be ready to join your session.
                
                Best regards,
                Focus Buddy Team
                ''',
                from_email='noreply@focusbuddy.com',
                recipient_list=[session.user.email],
                fail_silently=False,
            )
            
            # Mark reminder as sent
            session.reminder_sent = True
            session.save()
            
            print(f"Reminder sent for session at {session_time_ist}")
            
        except Exception as e:
            print(f"Failed to send reminder for session {session.id}: {e}")
    
    return f"Processed {sessions.count()} sessions"

@shared_task
def schedule_session_reminder(session_id, scheduled_time_ist_str):
    """
    Alternative: Schedule individual reminders when a session is created
    """
    from django.utils.dateparse import parse_datetime
    
    ist = pytz.timezone('Asia/Kolkata')
    
    # Parse the IST time string
    scheduled_time_ist = parse_datetime(scheduled_time_ist_str)
    if scheduled_time_ist.tzinfo is None:
        scheduled_time_ist = ist.localize(scheduled_time_ist)
    
    # Calculate reminder time (15 minutes before)
    reminder_time_ist = scheduled_time_ist - timedelta(minutes=15)
    
    # Convert to UTC for Celery
    reminder_time_utc = reminder_time_ist.astimezone(pytz.UTC)
    
    # Schedule the email task
    send_individual_reminder.apply_async(
        args=[session_id],
        eta=reminder_time_utc
    )

@shared_task
def send_individual_reminder(session_id):
    """
    Send reminder for a specific session
    """
    try:
        session = YourSessionModel.objects.get(id=session_id)
        ist = pytz.timezone('Asia/Kolkata')
        
        # Convert session time to IST for display
        session_time_ist = session.scheduled_time.astimezone(ist)
        
        send_mail(
            subject=f'Session Starting Soon - 15 minutes reminder',
            message=f'''
            Hi {session.user.first_name},
            
            Your session is starting in 15 minutes!
            
            Session Time: {session_time_ist.strftime('%I:%M %p IST on %B %d, %Y')}
            
            Please be ready to join.
            
            Best regards,
            Focus Buddy Team
            ''',
            from_email='noreply@focusbuddy.com',
            recipient_list=[session.user.email],
        )
        
        return f"Reminder sent for session {session_id}"
        
    except YourSessionModel.DoesNotExist:
        return f"Session {session_id} not found"
    except Exception as e:
        return f"Error sending reminder: {e}"