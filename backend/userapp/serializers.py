from rest_framework import serializers
from .models import *
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken
import random
from django.utils import timezone
import logging
import razorpay
from django.conf import settings
from django.db import transaction

logger = logging.getLogger(__name__)

#Registeration 
class SignupSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['name','email','phone','password']
        extra_kwargs = {
            'password': {'write_only': True},
            'email': {'validators': []}  
        }

    def validate_email(self, value):
        logger.info(f"Validating email: {value}")
        # Check if user exists and is verified
        existing_user = User.objects.filter(email=value).first()
        if existing_user:
            logger.info(f"User exists with email {value}, is_verified: {existing_user.is_verified}")
            if existing_user.is_verified:
                raise serializers.ValidationError("This email is already registered. Please login instead.")
        return value

    def create(self, validated_data):
        logger.info(f"Creating user with data: {validated_data}")
        email = validated_data['email']
        
        # Check if user exists and is verified
        existing_user = User.objects.filter(email=email).first()
        if existing_user:
            logger.info(f"Found existing user: {existing_user.email}, is_verified: {existing_user.is_verified}")
            if existing_user.is_verified:
                raise serializers.ValidationError({
                    'email': ['This email is already registered. Please login instead.']
                })
            else:
                logger.info("Updating unverified user")
                # Update existing unverified user
                existing_user.name = validated_data['name']
                existing_user.phone = validated_data['phone']
                existing_user.set_password(validated_data['password'])
                existing_user.otp = f"{random.randint(100000, 999999)}"
                existing_user.otp_created_at = timezone.now()
                existing_user.save()
                return existing_user

        # Create new user if no existing user
        logger.info("Creating new user")
        otp = f"{random.randint(100000, 999999)}"
        validated_data['otp'] = otp
        validated_data['otp_created_at'] = timezone.now()
        user = User.objects.create_user(**validated_data)
        logger.info(f"Created new user: {user.email}")
        return user

#OTP verification
class OtpVerifySerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp = serializers.CharField()

#Subject Selection
class SubjectSelectionSerializer(serializers.Serializer):
    email = serializers.EmailField()
    subjects = serializers.ListField(
        child = serializers.IntegerField()
    )

class SubjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subject
        fields = ['id', 'name']

class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        email = data.get("email")
        password = data.get("password")
        user = authenticate(email=email, password=password)

        if not user:
            raise serializers.ValidationError("Invalid credentials or unverified user")

        if not user.is_verified:
            raise serializers.ValidationError("User not verified with OTP")

        if not user.is_active:
            raise serializers.ValidationError("Your account has been blocked by the admin.")

        refresh = RefreshToken.for_user(user)
        return {
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": {
                "id": user.id,
                "name": user.name,
                "email": user.email
            }
        }

class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        try:
            user = User.objects.get(email=value)
        except User.DoesNotExist:
            raise serializers.ValidationError("No user found with this email address.")
        
        # Check if user is active
        if not user.is_active:
            raise serializers.ValidationError("User has been blocked by the admin.")
        
        return value

    def create(self, validated_data):
        email = validated_data['email']
        user = User.objects.get(email=email)
        otp = f"{random.randint(100000, 999999)}"
        user.otp = otp
        user.otp_created_at = timezone.now()
        user.save()
        print(f"OTP: {otp}")  
        return user

class VerifyForgotPasswordOTPSerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp = serializers.CharField(max_length=6)

    def validate(self, data):
        email = data.get('email')
        otp = data.get('otp')
        
        try:
            user = User.objects.get(email=email)
            if user.otp != otp:
                raise serializers.ValidationError("Invalid OTP")
        except User.DoesNotExist:
            raise serializers.ValidationError("User not found")
        
        return data

class ResetPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp = serializers.CharField(max_length=6)
    new_password = serializers.CharField(write_only=True)

    def validate(self, data):
        email = data.get('email')
        otp = data.get('otp')
        new_password = data.get('new_password')
        
        try:
            user = User.objects.get(email=email)
            if user.otp != otp:
                raise serializers.ValidationError("Invalid OTP")
        except User.DoesNotExist:
            raise serializers.ValidationError("User not found")
        
        return data

    def update(self, instance, validated_data):
        user = User.objects.get(email=validated_data['email'])
        user.set_password(validated_data['new_password'])
        user.otp = None  # Clear the OTP after successful password reset
        user.save()
        return user

class TaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = ['id', 'title', 'description', 'estimated_minutes', 
                 'estimated_pomodoros', 'completed_pomodoros', 'is_completed',
                 'created_at', 'updated_at']
        read_only_fields = ['estimated_pomodoros', 'completed_pomodoros', 
                           'is_completed', 'created_at', 'updated_at']

class PomodoroSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = PomodoroSession
        fields = ['id', 'task', 'session_type', 'start_time', 'end_time',
                 'duration_minutes', 'is_completed']
        read_only_fields = ['end_time', 'is_completed']

class PomodoroSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = PomodoroSettings
        fields = ['id', 'focus_duration', 'short_break_duration',
                 'long_break_duration', 'sessions_before_long_break',
                 'auto_start_next_session', 'play_sound_when_session_ends']

class JournalSerializer(serializers.ModelSerializer):
    class Meta:
        model = Journal
        fields = ['id', 'user', 'mood', 'description', 'date', 'created_at', 'updated_at']
        read_only_fields = ['user', 'created_at', 'updated_at']

class MentorSerializer(serializers.ModelSerializer):
    # User fields
    name = serializers.CharField(source='user.name', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    bio = serializers.CharField(source='user.bio', read_only=True)
    experience = serializers.IntegerField(source='user.experience', read_only=True)
    subjects = SubjectSerializer(source='user.subjects', many=True, read_only=True)
    
    # Profile image URL
    profile_image_url = serializers.SerializerMethodField()
    
    # Convert decimal fields to float for frontend
    hourly_rate = serializers.SerializerMethodField()
    rating = serializers.SerializerMethodField()

    class Meta:
        model = Mentor
        fields = [
            'id',
            'name',
            'email',
            'bio',
            'experience',
            'subjects',
            'expertise_level',
            'hourly_rate',
            'availability',
            'rating',
            'total_sessions',
            'total_students',
            'is_available',
            'profile_image_url',
            'created_at',
            'updated_at'
        ]

    def get_profile_image_url(self, obj):
        if obj.profile_image:
            return obj.profile_image.url
        return None

    def get_hourly_rate(self, obj):
        return float(obj.hourly_rate)

    def get_rating(self, obj):
        return float(obj.rating)

class MentorSessionSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.name', read_only=True)
    mentor_name = serializers.CharField(source='mentor.user.name', read_only=True)
    mentor_profile_image = serializers.CharField(source='mentor.profile_image.url', read_only=True)
    subjects_data = serializers.SerializerMethodField(read_only=True)
    session_datetime = serializers.SerializerMethodField(read_only=True)
    is_upcoming = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = MentorSession
        fields = [
            'id', 'student', 'mentor', 'scheduled_date', 'scheduled_time',
            'duration_minutes', 'session_mode', 'status', 'meeting_link',
            'meeting_id', 'meeting_password', 'session_notes', 'student_feedback',
            'mentor_feedback', 'student_rating', 'mentor_rating', 'subjects',
            'created_at', 'updated_at', 'confirmed_at', 'started_at', 'ended_at',
            'cancelled_at', 'cancelled_by', 'cancellation_reason',
            'student_name', 'mentor_name', 'mentor_profile_image', 'subjects_data',
            'session_datetime', 'is_upcoming'
        ]
        read_only_fields = [
            'created_at', 'updated_at', 'confirmed_at', 'started_at', 
            'ended_at', 'cancelled_at'
        ]
    
    def get_subjects_data(self, obj):
        return [{'id': subject.id, 'name': subject.name} for subject in obj.subjects.all()]
    
    def get_session_datetime(self, obj):
        return obj.session_datetime.isoformat() if obj.session_datetime else None
    
    def get_is_upcoming(self, obj):
        return obj.is_upcoming


class SessionPaymentSerializer(serializers.ModelSerializer):
    session_details = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = SessionPayment
        fields = [
            'id', 'session', 'amount', 'currency', 'payment_method', 'status',
            'transaction_id', 'gateway_payment_id', 'gateway_order_id',
            'gateway_signature', 'base_amount', 'platform_fee', 'tax_amount',
            'discount_amount', 'refund_amount', 'refund_reason', 'refunded_at',
            'created_at', 'updated_at', 'paid_at', 'gateway_response',
            'session_details'
        ]
        read_only_fields = ['created_at', 'updated_at', 'paid_at', 'refunded_at']
    
    def get_session_details(self, obj):
        return {
            'id': obj.session.id,
            'student_name': obj.session.student.name,
            'mentor_name': obj.session.mentor.user.name,
            'scheduled_date': obj.session.scheduled_date,
            'scheduled_time': obj.session.scheduled_time,
        }


class CreateOrderSerializer(serializers.Serializer):
    """Serializer for creating Razorpay order (no DB save)"""
    mentor_id = serializers.IntegerField()
    scheduled_date = serializers.DateField()
    scheduled_time = serializers.TimeField()
    duration_minutes = serializers.ChoiceField(choices=[30, 60, 90, 120])
    session_mode = serializers.ChoiceField(choices=['video', 'voice', 'chat'])
    subjects = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        allow_empty=True
    )
    
    def validate_mentor_id(self, value):
        try:
            mentor = Mentor.objects.get(id=value, is_approved=True, is_available=True)
            # Store the mentor object for later use but return the ID
            self._mentor_obj = mentor
            return value  # Return the original ID, not the mentor object
        except Mentor.DoesNotExist:
            raise serializers.ValidationError("Mentor not found or not available")
    
    def validate_scheduled_date(self, value):
        if value < timezone.now().date():
            raise serializers.ValidationError("Cannot schedule sessions in the past")
        return value
    
    def validate(self, data):
    # Get the mentor object that we stored during field validation
        mentor = getattr(self, '_mentor_obj', None)
        if not mentor:
            # Fallback if _mentor_obj wasn't set
            try:
                mentor = Mentor.objects.get(id=data['mentor_id'], is_approved=True, is_available=True)
            except Mentor.DoesNotExist:
                raise serializers.ValidationError("Mentor not found or not available")
        
        scheduled_date = data['scheduled_date']
        scheduled_time = data['scheduled_time']
        
        # Check if mentor is available on the selected day and time
        day_name = scheduled_date.strftime('%A').lower()
        mentor_availability = mentor.availability.get(day_name, [])
        
        # Debug: Show the actual date and calculated day
        print(f"Debug - Scheduled date: {scheduled_date}")
        print(f"Debug - Scheduled date type: {type(scheduled_date)}")
        print(f"Debug - Calculated day name: {day_name}")
        print(f"Debug - Date weekday number: {scheduled_date.weekday()}")  # Monday=0, Sunday=6
        
        # Convert scheduled time to 12-hour format to match availability storage
        scheduled_time_12hr = scheduled_time.strftime('%I:%M %p').lstrip('0')
        # Remove leading zero from hour (e.g., "08:00 PM" becomes "8:00 PM")
        
        # Also try alternative formats
        time_formats_to_check = [
            scheduled_time_12hr,                    # "8:00 PM"
            scheduled_time.strftime('%I:%M %p'),    # "08:00 PM" (with leading zero)
            scheduled_time.strftime('%H:%M'),       # "20:00" (24-hour format)
            scheduled_time.strftime('%H:%M:%S'),    # "20:00:00"
        ]
        
        # Debug logging (remove after fixing)
        print(f"Debug - Mentor availability for {day_name}: {mentor_availability}")
        print(f"Debug - All mentor availability: {mentor.availability}")
        print(f"Debug - Scheduled time formats to check: {time_formats_to_check}")
        
        # Check if the time slot is available
        time_available = False
        if mentor_availability:
            for time_format in time_formats_to_check:
                if time_format in mentor_availability:
                    time_available = True
                    print(f"Debug - Match found: {time_format}")
                    break
        
        if not time_available:
            available_times = ", ".join(mentor_availability) if mentor_availability else "None"
            raise serializers.ValidationError(
                f"Mentor is not available on {day_name} at {scheduled_time_12hr}. "
                f"Available times for {day_name}: {available_times}"
            )
        
        # Check for conflicting sessions
        conflicting_sessions = MentorSession.objects.filter(
            mentor=mentor,
            scheduled_date=scheduled_date,
            scheduled_time=scheduled_time,
            status__in=['pending', 'confirmed', 'ongoing']
        )
        
        if conflicting_sessions.exists():
            raise serializers.ValidationError(
                "This time slot is already booked"
            )
        
        return data

class ConfirmBookingSerializer(serializers.Serializer):
    """Serializer for confirming booking after successful payment"""
    razorpay_payment_id = serializers.CharField()
    razorpay_order_id = serializers.CharField()
    razorpay_signature = serializers.CharField()
    mentor_id = serializers.IntegerField()
    scheduled_date = serializers.DateField()
    scheduled_time = serializers.TimeField()
    duration_minutes = serializers.ChoiceField(choices=[30, 60, 90, 120])
    session_mode = serializers.ChoiceField(choices=['video', 'voice', 'chat'])
    subjects = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        allow_empty=True
    )
    
    def validate(self, data):
        # Verify payment signature
        client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
        
        try:
            client.utility.verify_payment_signature({
                'razorpay_order_id': data['razorpay_order_id'],
                'razorpay_payment_id': data['razorpay_payment_id'],
                'razorpay_signature': data['razorpay_signature']
            })
        except Exception as e:
            raise serializers.ValidationError(f"Payment verification failed: {str(e)}")
        
        # Validate mentor exists
        try:
            mentor = Mentor.objects.get(id=data['mentor_id'])
        except Mentor.DoesNotExist:
            raise serializers.ValidationError("Invalid mentor ID")
        
        # Re-validate mentor availability (double-check)
        scheduled_date = data['scheduled_date']
        scheduled_time = data['scheduled_time']
        
        conflicting_sessions = MentorSession.objects.filter(
            mentor=mentor,
            scheduled_date=scheduled_date,
            scheduled_time=scheduled_time,
            status__in=['pending', 'confirmed', 'ongoing']
        )
        
        if conflicting_sessions.exists():
            raise serializers.ValidationError(
                "This time slot was booked by someone else. Refund will be initiated."
            )
        
        return data
    
    def create(self, validated_data):
        user = self.context['request'].user
        
        try:
            mentor = Mentor.objects.get(id=validated_data['mentor_id'])
        except Mentor.DoesNotExist:
            raise serializers.ValidationError("Mentor not found")
        
        subjects_ids = validated_data.pop('subjects', [])
        
        # Remove payment-related fields from session data
        payment_data = {
            'razorpay_payment_id': validated_data.pop('razorpay_payment_id'),
            'razorpay_order_id': validated_data.pop('razorpay_order_id'),
            'razorpay_signature': validated_data.pop('razorpay_signature'),
        }
        validated_data.pop('mentor_id')
        
        # Calculate amounts
        duration_hours = validated_data['duration_minutes'] / 60
        base_amount = Decimal(str(mentor.hourly_rate)) * Decimal(str(duration_hours))
        platform_fee = base_amount * Decimal('0.10')
        tax_amount = base_amount * Decimal('0.18')
        total_amount = base_amount + platform_fee + tax_amount
        
        session = None
        payment = None
        
        with transaction.atomic():
            # Create the session
            session = MentorSession.objects.create(
                student=user,
                mentor=mentor,
                status='confirmed',  # Directly confirmed since payment is already successful
                **validated_data
            )
            
            # Add subjects if provided
            if subjects_ids:
                try:
                    subjects = Subject.objects.filter(id__in=subjects_ids)
                    if subjects.exists():
                        session.subjects.set(subjects)
                except Exception as e:
                    print(f"Error setting subjects: {e}")
            
            # Create payment record with successful status
            payment = SessionPayment.objects.create(
                session=session,
                amount=total_amount,
                currency='INR',
                payment_method='razorpay',
                base_amount=base_amount,
                platform_fee=platform_fee,
                tax_amount=tax_amount,
                status='completed',
                gateway_payment_id=payment_data['razorpay_payment_id'],
                gateway_order_id=payment_data['razorpay_order_id'],
                gateway_signature=payment_data['razorpay_signature'],
                transaction_id=payment_data['razorpay_payment_id'],
                paid_at=timezone.now()
            )
            
            # Create earnings record for mentor
            mentor_earning = base_amount - (base_amount * Decimal('0.10'))
            MentorEarnings.objects.create(
                mentor=mentor,
                session=session,
                session_amount=base_amount,
                platform_commission=base_amount * Decimal('0.10'),
                mentor_earning=mentor_earning
            )
        
        # Store payment reference for API view access
        session._payment = payment
        return session


class SessionReviewSerializer(serializers.ModelSerializer):
    reviewer_name = serializers.CharField(source='reviewer.name', read_only=True)
    session_details = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = SessionReview
        fields = [
            'id', 'session', 'reviewer', 'rating', 'review_text',
            'communication_rating', 'knowledge_rating', 'helpfulness_rating',
            'is_public', 'is_verified', 'created_at', 'updated_at',
            'reviewer_name', 'session_details'
        ]
        read_only_fields = ['created_at', 'updated_at', 'is_verified']
    
    def get_session_details(self, obj):
        return {
            'id': obj.session.id,
            'mentor_name': obj.session.mentor.user.name,
            'scheduled_date': obj.session.scheduled_date,
        }


class SessionMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source='sender.name', read_only=True)
    
    class Meta:
        model = SessionMessage
        fields = [
            'id', 'session', 'sender', 'message', 'is_system_message',
            'created_at', 'sender_name'
        ]
        read_only_fields = ['created_at']



