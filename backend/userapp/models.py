from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.utils import timezone

class Subject(models.Model):
    name = models.CharField(max_length=100)

    def __str__(self):
        return self.name

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
    date_joined = models.DateTimeField(default=timezone.now)
    otp = models.CharField(max_length=6, blank=True, null=True)
    is_verified = models.BooleanField(default=False)
    subjects = models.ManyToManyField(Subject, related_name='users', blank=True)

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['name']

    objects = UserManager()

    def __str__(self):
        return self.email

class Mentor(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='mentor_profile')
    expertise_level = models.CharField(
        max_length=20,
        choices=[
            ('beginner', 'Beginner'),
            ('intermediate', 'Intermediate'),
            ('advanced', 'Advanced'),
            ('expert', 'Expert')
        ],
        default='intermediate'
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

    class Meta:
        ordering = ['-rating', '-total_sessions']

    def __str__(self):
        return f"{self.user.name}'s Mentor Profile"

    def save(self, *args, **kwargs):
        # Ensure the associated user is marked as a mentor
        if not self.user.is_mentor:
            self.user.is_mentor = True
            self.user.save()
        super().save(*args, **kwargs)

    @property
    def full_profile(self):
        """Returns a dictionary with both user and mentor information"""
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
            'is_available': self.is_available
        }

