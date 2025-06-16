from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.utils import timezone
from cloudinary.models import CloudinaryField
from django.core.validators import MinValueValidator, MaxValueValidator
from decimal import Decimal

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
            'profile_image_url': self.profile_image.url if self.profile_image else None
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