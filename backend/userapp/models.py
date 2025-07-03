from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.utils import timezone
from cloudinary.models import CloudinaryField
from django.core.validators import MinValueValidator, MaxValueValidator
from decimal import Decimal
from datetime import datetime, timedelta



class Subject(models.Model):
    name = models.CharField(max_length=100)

    def __str__(self):
        return self.name

class Task(models.Model):
    user = models.ForeignKey('User', on_delete=models.CASCADE, related_name='tasks')
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    estimated_minutes = models.IntegerField()
    estimated_pomodoros = models.IntegerField()
    completed_pomodoros = models.IntegerField(default=0)
    is_completed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.title} - {self.user.name}"

    def save(self, *args, **kwargs):
        # Calculate estimated pomodoros (25 minutes per pomodoro)
        if not self.estimated_pomodoros:
            self.estimated_pomodoros = (self.estimated_minutes + 24) // 25  # Round up
        super().save(*args, **kwargs)

class PomodoroSession(models.Model):
    SESSION_TYPES = [
        ('focus', 'Focus'),
        ('short_break', 'Short Break'),
        ('long_break', 'Long Break'),
    ]

    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='sessions')
    session_type = models.CharField(max_length=20, choices=SESSION_TYPES)
    start_time = models.DateTimeField()
    end_time = models.DateTimeField(null=True, blank=True)
    duration_minutes = models.IntegerField()
    is_completed = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.task.title} - {self.session_type} Session"

class PomodoroSettings(models.Model):
    user = models.OneToOneField('User', on_delete=models.CASCADE, related_name='pomodoro_settings')
    focus_duration = models.IntegerField(default=25)  # in minutes
    short_break_duration = models.IntegerField(default=5)  # in minutes
    long_break_duration = models.IntegerField(default=15)  # in minutes
    sessions_before_long_break = models.IntegerField(default=4)
    auto_start_next_session = models.BooleanField(default=False)
    play_sound_when_session_ends = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Pomodoro Settings - {self.user.name}"

class UserManager(BaseUserManager):
    def create_user(self,email,name,password=None,**extra_fields):
        if not email:
            raise ValueError("Users must have an email address")
        email = self.normalize_email(email)
        user = self.model(email=email,name=name,**extra_fields)
        user.set_password(password)
        user.date_joined=timezone.now()
        user.save(using=self._db)
        return user
    
    def create_superuser(self, email, name, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        return self.create_user(email, name, password, **extra_fields)
class User(AbstractBaseUser, PermissionsMixin):
    name = models.CharField(max_length=255)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=15)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    is_mentor = models.BooleanField(default=False)
    date_joined = models.DateTimeField(default=timezone.now)
    otp = models.CharField(max_length=6, blank=True, null=True)
    otp_created_at = models.DateTimeField(null=True, blank=True)
    is_verified = models.BooleanField(default=False)
    subjects = models.ManyToManyField(Subject, related_name='users', blank=True)
    bio = models.TextField(blank=True, null=True)
    experience = models.IntegerField(default=0)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['name']

    objects = UserManager()

    def __str__(self):
        return self.email

    @property
    def username(self):
        return self.email


class Mentor(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='mentor_profile')
    profile_image = CloudinaryField('image', blank=True, null=True)

    expertise_level = models.CharField(
        max_length=20,
        choices=[
            ('beginner', 'Beginner'),
            ('intermediate', 'Intermediate'),
            ('advanced', 'Advanced'),
            ('expert', 'Expert')
        ]
    )
    hourly_rate = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    availability = models.JSONField(
        default=dict,
        help_text="JSON field to store availability schedule"
    )
    rating = models.DecimalField(max_digits=3, decimal_places=2, default=0.00)
    total_sessions = models.IntegerField(default=0)
    total_students = models.IntegerField(default=0)
    is_available = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_approved = models.BooleanField(default=False)
    rejection_reason = models.TextField(blank=True, null=True)
    approval_status = models.CharField(
        max_length=20, 
        choices=[
            ('pending', 'Pending'),
            ('approved', 'Approved'),
            ('rejected', 'Rejected'),
        ],
        default='pending'
    )
    submitted_for_approval = models.BooleanField(default=False)
    submitted_at = models.DateTimeField(null=True, blank=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    approved_by = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='approved_mentors'
    )

    class Meta:
        ordering = ['-rating', '-total_sessions']

    def __str__(self):
        return f"{self.user.name}'s Mentor Profile"

    def save(self, *args, **kwargs):
        if not self.user.is_mentor:
            self.user.is_mentor = True
            self.user.save()
        super().save(*args, **kwargs)

    @property
    def full_profile(self):
        return {
            'id': self.user.id,
            'name': self.user.name,
            'email': self.user.email,
            'subjects': self.user.subjects,
            'bio': self.user.bio,
            'experience': self.user.experience,
            'expertise_level': self.expertise_level,
            'hourly_rate': float(self.hourly_rate),
            'availability': self.availability,
            'rating': float(self.rating),
            'total_sessions': self.total_sessions,
            'total_students': self.total_students,
            'is_available': self.is_available,
            'profile_image_url': self.profile_image.url if self.profile_image else None,
            'rejection_reason': self.rejection_reason,
        }

class MentorApprovalRequest(models.Model):
    mentor = models.ForeignKey(Mentor, on_delete=models.CASCADE)
    requested_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(
        max_length=20,
        choices=[
            ('pending', 'Pending'),
            ('approved', 'Approved'),
            ('rejected', 'Rejected'),
        ],
        default='pending'
    )
    admin_notes = models.TextField(blank=True, null=True)
    processed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='processed_approval_requests'
    )
    processed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-requested_at']
        
    def __str__(self):
        return f"Approval request for {self.mentor.user.name} - {self.status}"

class Journal(models.Model):
    MOOD_CHOICES = [
        ('happy', 'Happy'),
        ('sad', 'Sad'),
        ('anxious', 'Anxious'),
        ('neutral', 'Neutral'),
        ('excited', 'Excited'),
        ('angry', 'Angry'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='journals')
    mood = models.CharField(max_length=20, choices=MOOD_CHOICES)
    description = models.TextField()
    date = models.DateField()  # The date the entry refers to
    created_at = models.DateTimeField(auto_now_add=True)  
    updated_at = models.DateTimeField(auto_now=True)
    is_blocked = models.BooleanField(default=False)      

    def __str__(self):
        return f"{self.user.name} - {self.date} ({self.mood})"



class MentorSession(models.Model):
    SESSION_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('confirmed', 'Confirmed'),
        ('ongoing', 'Ongoing'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
        ('no_show', 'No Show'),
    ]
    
    SESSION_MODE_CHOICES = [
        ('video', 'Video'),
        ('voice', 'Voice'),
        ('chat', 'Chat'),
    ]
    
    DURATION_CHOICES = [
        (30, '30 minutes'),
        (60, '1 hour'),
        (90, '1.5 hours'),
        (120, '2 hours'),
    ]

    # Core session details
    student = models.ForeignKey(User, on_delete=models.CASCADE, related_name='student_sessions')
    mentor = models.ForeignKey(Mentor, on_delete=models.CASCADE, related_name='mentor_sessions')
    
    # Session scheduling
    scheduled_date = models.DateField()
    scheduled_time = models.TimeField()
    duration_minutes = models.IntegerField(choices=DURATION_CHOICES, default=30)
    
    # Session details
    session_mode = models.CharField(max_length=10, choices=SESSION_MODE_CHOICES, default='video')
    status = models.CharField(max_length=15, choices=SESSION_STATUS_CHOICES, default='pending')
    
    # track notifications being sent
    reminder_sent = models.BooleanField(default=False)
    reminder_sent_at = models.DateTimeField(blank=True, null=True)
    
    # Meeting details (populated when session is confirmed)
    meeting_link = models.URLField(blank=True, null=True)
    meeting_id = models.CharField(max_length=100, blank=True, null=True)
    meeting_password = models.CharField(max_length=50, blank=True, null=True)
    
    # Session notes and feedback
    session_notes = models.TextField(blank=True, null=True, help_text="Notes from the session")
    student_feedback = models.TextField(blank=True, null=True)
    mentor_feedback = models.TextField(blank=True, null=True)
    
    # Ratings
    student_rating = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        blank=True, 
        null=True,
        help_text="Student's rating of the mentor (1-5)"
    )
    mentor_rating = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        blank=True, 
        null=True,
        help_text="Mentor's rating of the student (1-5)"
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    confirmed_at = models.DateTimeField(blank=True, null=True)
    started_at = models.DateTimeField(blank=True, null=True)
    ended_at = models.DateTimeField(blank=True, null=True)
    cancelled_at = models.DateTimeField(blank=True, null=True)
    
    # Cancellation details
    cancelled_by = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        blank=True, 
        null=True,
        related_name='cancelled_sessions'
    )
    cancellation_reason = models.TextField(blank=True, null=True)
    
    # Subjects covered in the session
    subjects = models.ManyToManyField(Subject, blank=True)
    
    class Meta:
        ordering = ['-scheduled_date', '-scheduled_time']
        unique_together = ['mentor', 'scheduled_date', 'scheduled_time']
    
    def __str__(self):
        return f"{self.student.name} - {self.mentor.user.name} ({self.scheduled_date} {self.scheduled_time})"
    
    @property
    def is_upcoming(self):
        """Check if the session is in the future"""
        session_datetime = timezone.datetime.combine(self.scheduled_date, self.scheduled_time)
        return session_datetime > timezone.now()
    
    @property
    def session_datetime(self):
        """Return combined datetime for the session"""
        return timezone.datetime.combine(self.scheduled_date, self.scheduled_time)
    
    def cancel_session(self, cancelled_by_user, reason=None):
        """Cancel the session"""
        self.status = 'cancelled'
        self.cancelled_by = cancelled_by_user
        self.cancelled_at = timezone.now()
        if reason:
            self.cancellation_reason = reason
        self.save()

    @property
    def is_upcoming(self):
        session_datetime = datetime.combine(self.scheduled_date, self.scheduled_time)
        
        if timezone.is_naive(session_datetime):
            session_datetime = timezone.make_aware(session_datetime)
        
        return session_datetime > timezone.now()


class SessionPayment(models.Model):
    PAYMENT_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded'),
        ('partially_refunded', 'Partially Refunded'),
    ]
    
    PAYMENT_METHOD_CHOICES = [
        ('razorpay', 'Razorpay'),
        ('stripe', 'Stripe'),
        ('paypal', 'PayPal'),
        ('wallet', 'Wallet'),
        ('free', 'Free Session'),
    ]

    session = models.OneToOneField(MentorSession, on_delete=models.CASCADE, related_name='payment')
    
    # Payment details
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default='INR')
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES)
    status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='pending')
    
    # External payment gateway details
    transaction_id = models.CharField(max_length=100, blank=True, null=True)
    gateway_payment_id = models.CharField(max_length=100, blank=True, null=True)
    gateway_order_id = models.CharField(max_length=100, blank=True, null=True)
    gateway_signature = models.CharField(max_length=200, blank=True, null=True)
    
    # Payment breakdown
    base_amount = models.DecimalField(max_digits=10, decimal_places=2)
    platform_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    tax_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    # Refund details
    refund_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    refund_reason = models.TextField(blank=True, null=True)
    refunded_at = models.DateTimeField(blank=True, null=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    paid_at = models.DateTimeField(blank=True, null=True)
    
    # Gateway response (store full response for debugging)
    gateway_response = models.JSONField(blank=True, null=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Payment for {self.session} - {self.amount} {self.currency} ({self.status})"
    
    def mark_as_paid(self):
        """Mark payment as completed"""
        self.status = 'completed'
        self.paid_at = timezone.now()
        self.save()
        
        # Also confirm the session
        if self.session.status == 'pending':
            self.session.status = 'confirmed'
            self.session.confirmed_at = timezone.now()
            self.session.save()


class SessionReview(models.Model):
    session = models.OneToOneField(MentorSession, on_delete=models.CASCADE, related_name='review')
    reviewer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='session_reviews')
    
    # Review details
    rating = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    review_text = models.TextField()
   
    # Meta information
    is_public = models.BooleanField(default=True)
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        unique_together = ['session', 'reviewer']
    
    def __str__(self):
        return f"Review by {self.reviewer.name} for session {self.session.id}"


class SessionMessage(models.Model):
    session = models.ForeignKey(MentorSession, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_session_messages')
    
    message = models.TextField()
    is_system_message = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['created_at']
    
    def __str__(self):
        return f"Message from {self.sender.name} in session {self.session.id}"


class MentorEarnings(models.Model):
    PAYOUT_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]
    
    mentor = models.ForeignKey(Mentor, on_delete=models.CASCADE, related_name='earnings')
    session = models.ForeignKey(MentorSession, on_delete=models.CASCADE, related_name='earnings')
    
    # Earnings calculation
    session_amount = models.DecimalField(max_digits=10, decimal_places=2)
    platform_commission = models.DecimalField(max_digits=10, decimal_places=2)
    mentor_earning = models.DecimalField(max_digits=10, decimal_places=2)
    
    # Payout details
    payout_status = models.CharField(max_length=20, choices=PAYOUT_STATUS_CHOICES, default='pending')
    payout_date = models.DateTimeField(blank=True, null=True)
    payout_reference = models.CharField(max_length=100, blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Earnings for {self.mentor.user.name} - Session {self.session.id}"



class FocusBuddySession(models.Model):
    """Model for group focus buddy sessions that users can create and join"""
    DURATION_CHOICES = [
        (15, '15 minutes'),
        (25, '25 minutes'),
        (50, '50 minutes'),
    ]
    
    SESSION_STATUS_CHOICES = [
        ('active', 'Active Session'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
        ('expired', 'Expired'),
    ]
    
    SESSION_TYPE_CHOICES = [
        ('study', 'Study'),
        ('work', 'Work'),
        ('reading', 'Reading'),
    ]
    
    # Session creator
    creator_id = models.ForeignKey('User', on_delete=models.CASCADE, related_name='created_focus_sessions')
    
    # Session details
    title = models.CharField(max_length=200, blank=True, null=True)  # Optional session title
    session_type = models.CharField(max_length=10, choices=SESSION_TYPE_CHOICES, default='video')
    status = models.CharField(max_length=15, choices=SESSION_STATUS_CHOICES, default='active')
    duration_minutes = models.IntegerField(choices=DURATION_CHOICES, default=25)
    max_participants = models.IntegerField(default=10)  # Maximum number of participants
    
    # Session timing
    started_at = models.DateTimeField(auto_now_add=True)  # Session starts when created
    ends_at = models.DateTimeField()  # When session will auto-end
    ended_at = models.DateTimeField(null=True, blank=True)  # Actual end time
    
    # Session metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        title = self.title or f"{self.duration_minutes}min Focus Session"
        return f"{title} by {self.creator.name} ({self.status})"
    
    def save(self, *args, **kwargs):
        # Set ends_at when session is created
        if not self.ends_at:
            self.ends_at = self.started_at + timedelta(minutes=self.duration_minutes)
        super().save(*args, **kwargs)
    
    @property
    def is_expired(self):
        """Check if session has expired"""
        return timezone.now() > self.ends_at
    
    @property
    def remaining_time_seconds(self):
        """Get remaining time in seconds"""
        if self.status != 'active':
            return 0
        remaining = (self.ends_at - timezone.now()).total_seconds()
        return max(0, int(remaining))
    
    @property
    def participant_count(self):
        """Get current number of participants"""
        return self.participants.filter(left_at__isnull=True).count()
    
    @property
    def is_full(self):
        """Check if session is at maximum capacity"""
        return self.participant_count >= self.max_participants
    
    @property
    def can_join(self):
        """Check if new users can join this session"""
        return (self.status == 'active' and 
                not self.is_expired and 
                not self.is_full)
    
    def end_session(self, reason='completed'):
        """End the focus session"""
        self.status = reason
        self.ended_at = timezone.now()
        self.save()
        
        # Mark all active participants as left
        active_participants = self.participants.filter(left_at__isnull=True)
        for participant in active_participants:
            participant.left_at = timezone.now()
            participant.save()


class FocusBuddyParticipant(models.Model):
    """Model to track participants in focus buddy sessions"""
    session = models.ForeignKey(FocusBuddySession, on_delete=models.CASCADE, related_name='participants')
    user = models.ForeignKey('User', on_delete=models.CASCADE, related_name='focus_participations')
    
    # Participation timing
    joined_at = models.DateTimeField(auto_now_add=True)
    left_at = models.DateTimeField(null=True, blank=True)
    
    # Participation preferences
    camera_enabled = models.BooleanField(default=True)
    microphone_enabled = models.BooleanField(default=True)
    
    class Meta:
        ordering = ['joined_at']
        unique_together = ['session', 'user']  
    
    def __str__(self):
        status = "Active" if not self.left_at else "Left"
        return f"{self.user.name} in {self.session} ({status})"
    
    @property
    def is_active(self):
        """Check if participant is currently active in the session"""
        return self.left_at is None
    
    @property
    def participation_duration_minutes(self):
        """Calculate how long the user has been/was in the session"""
        end_time = self.left_at or timezone.now()
        duration = (end_time - self.joined_at).total_seconds() / 60
        return max(0, int(duration))
    
    def leave_session(self):
        """Mark participant as having left the session"""
        if not self.left_at:
            self.left_at = timezone.now()
            self.save()


class FocusBuddyMessage(models.Model):
    """Model for chat messages during focus buddy sessions"""
    session = models.ForeignKey(FocusBuddySession, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey('User', on_delete=models.CASCADE, related_name='focus_messages')
    message = models.TextField()
    is_system_message = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['created_at']
    
    def __str__(self):
        sender_name = "System" if self.is_system_message else self.sender.name
        return f"{sender_name}: {self.message[:50]}..."


class FocusBuddyFeedback(models.Model):
    """Model for post-session feedback"""
    RATING_CHOICES = [
        (1, '1 - Poor'),
        (2, '2 - Fair'),
        (3, '3 - Good'),
        (4, '4 - Very Good'),
        (5, '5 - Excellent'),
    ]
    
    session = models.ForeignKey(FocusBuddySession, on_delete=models.CASCADE, related_name='feedback')
    participant = models.ForeignKey(FocusBuddyParticipant, on_delete=models.CASCADE, related_name='feedback_given')
    
    # Overall session rating
    session_rating = models.IntegerField(choices=RATING_CHOICES)
    feedback_text = models.TextField(blank=True, null=True)
    would_join_again = models.BooleanField(default=True)
    
    # Session quality aspects
    session_helpful = models.BooleanField(default=True)
    good_environment = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
        unique_together = ['session', 'participant']  # One feedback per participant per session
    
    def __str__(self):
        return f"Feedback by {self.participant.user.name} for session {self.session.id} - {self.session_rating}/5"


class FocusBuddyStats(models.Model):
    """Model to track user's focus buddy statistics"""
    user = models.OneToOneField('User', on_delete=models.CASCADE, related_name='focus_stats')
    
    # Session statistics
    total_sessions_joined = models.IntegerField(default=0)
    total_sessions_created = models.IntegerField(default=0)
    completed_sessions = models.IntegerField(default=0)
    total_focus_minutes = models.IntegerField(default=0)
    
    # Rating statistics
    average_session_rating = models.DecimalField(max_digits=3, decimal_places=2, default=0.00)
    total_ratings_given = models.IntegerField(default=0)
    
    # Streak tracking
    current_streak = models.IntegerField(default=0)  # Days with at least one session
    longest_streak = models.IntegerField(default=0)
    last_session_date = models.DateField(null=True, blank=True)
    
    # Participation preferences
    preferred_duration = models.IntegerField(choices=FocusBuddySession.DURATION_CHOICES, default=25)
    preferred_session_type = models.CharField(
        max_length=10, 
        choices=FocusBuddySession.SESSION_TYPE_CHOICES, 
        default='video'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Focus Stats for {self.user.name}"
    
    def update_stats_after_session(self, participant, session_rating=None):
        """Update statistics after a session participation"""
        self.total_sessions_joined += 1
        
        # Check if user created this session
        if participant.session.creator == self.user:
            self.total_sessions_created += 1
        
        # Update completed sessions and focus time
        if participant.session.status == 'completed':
            self.completed_sessions += 1
            self.total_focus_minutes += participant.participation_duration_minutes
            
            # Update streak
            today = timezone.now().date()
            if self.last_session_date:
                days_diff = (today - self.last_session_date).days
                if days_diff == 1:  # Consecutive day
                    self.current_streak += 1
                elif days_diff > 1:  # Streak broken
                    self.current_streak = 1
                # If same day, don't change streak
            else:
                self.current_streak = 1
            
            self.longest_streak = max(self.longest_streak, self.current_streak)
            self.last_session_date = today
        
        # Update rating if provided
        if session_rating:
            total_rating_points = (self.average_session_rating * self.total_ratings_given) + session_rating
            self.total_ratings_given += 1
            self.average_session_rating = total_rating_points / self.total_ratings_given
        
        self.save()
    
    @property
    def completion_rate(self):
        """Calculate session completion rate as percentage"""
        if self.total_sessions_joined == 0:
            return 0
        return (self.completed_sessions / self.total_sessions_joined) * 100
    
    @property 
    def average_session_duration(self):
        """Calculate average session duration in minutes"""
        if self.completed_sessions == 0:
            return 0
        return self.total_focus_minutes / self.completed_sessions