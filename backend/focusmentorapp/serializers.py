from rest_framework import serializers
from userapp.models import *
from rest_framework_simplejwt.tokens import RefreshToken
import random
from django.core.mail import send_mail
from django.conf import settings
import logging
from django.utils import timezone
from django.db import transaction
from .utils import CloudinaryService
from django.contrib.auth import authenticate, get_user_model
from userapp.models import SessionReview

User = get_user_model()

logger = logging.getLogger(__name__)

class MentorSignupSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    name = serializers.CharField(max_length=255)
    phone = serializers.CharField(max_length=15)
    subjects = serializers.ListField(
        child=serializers.CharField(),
        required=False
    )
    bio = serializers.CharField(required=False, allow_blank=True)
    experience = serializers.IntegerField(required=False, min_value=0)

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def create(self, validated_data):
        # Generate OTP
        otp = f"{random.randint(100000, 999999)}"
        print(f"\nGenerated OTP for {validated_data['email']}: {otp}\n")  # Print OTP in terminal
        
        # Create user with is_mentor flag
        user = User.objects.create_user(
            email=validated_data['email'],
            password=validated_data['password'],
            name=validated_data['name'],
            phone=validated_data['phone'],
            is_mentor=True,
            otp=otp,
            otp_created_at=timezone.now()
        )
        
        # Add additional mentor fields if provided
        if 'bio' in validated_data:
            user.bio = validated_data['bio']
        if 'experience' in validated_data:
            user.experience = validated_data['experience']
        
        user.save()
        
        # Send OTP email
        try:
            send_mail(
                subject="Your FocusBuddy Verification Code",
                message=f"Hello {user.name}, your verification code is {otp}",
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=False,
            )
        except Exception as e:
            logger.error(f"Failed to send OTP email: {str(e)}")
            # Don't raise the error, just log it
        
        return user

    def to_representation(self, instance):
        return {
            "id": instance.id,
            "name": instance.name,
            "email": instance.email,
            "is_mentor": instance.is_mentor,
            "bio": instance.bio,
            "experience": instance.experience
        }

class MentorLoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        email = data.get("email")
        password = data.get("password")
        
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            raise serializers.ValidationError("Invalid credentials")

        if not user.check_password(password):
            raise serializers.ValidationError("Invalid credentials")

        if not user.is_mentor:
            raise serializers.ValidationError("Not authorized as mentor")

        if not user.is_active:
            raise serializers.ValidationError("Your account has been blocked by the admin.")

        # Generate mentor-specific tokens
        refresh = RefreshToken.for_user(user)
        return {
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": {
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "is_mentor": user.is_mentor,
                "subjects": [{"id": subject.id, "name": subject.name} for subject in user.subjects.all()],
                "bio": user.bio,
                "experience": user.experience
            }
        }


class MentorOtpVerifySerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp = serializers.CharField()

class MentorSubjectSelectionSerializer(serializers.Serializer):
    email = serializers.EmailField()
    subjects = serializers.ListField(
        child=serializers.IntegerField(),
        min_length=1
    )

class MentorForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        if not User.objects.filter(email=value, is_mentor=True).exists():
            raise serializers.ValidationError("No mentor found with this email address.")
        return value

    def create(self, validated_data):
        email = validated_data['email']
        user = User.objects.get(email=email, is_mentor=True)
        otp = f"{random.randint(100000, 999999)}"
        user.otp = otp
        user.save()
        print(f"Mentor Password Reset OTP for {user.email}: {otp}")  # Print OTP in terminal
        return user

class MentorVerifyForgotPasswordOTPSerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp = serializers.CharField(max_length=6)

    def validate(self, data):
        email = data.get('email')
        otp = data.get('otp')
        
        try:
            user = User.objects.get(email=email, is_mentor=True)
            if user.otp != otp:
                raise serializers.ValidationError("Invalid OTP")
        except User.DoesNotExist:
            raise serializers.ValidationError("Mentor not found")
        
        return data

class MentorResetPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp = serializers.CharField(max_length=6)
    new_password = serializers.CharField(write_only=True)

    def validate(self, data):
        email = data.get('email')
        otp = data.get('otp')
        new_password = data.get('new_password')
        
        try:
            user = User.objects.get(email=email, is_mentor=True)
            if user.otp != otp:
                raise serializers.ValidationError("Invalid OTP")
        except User.DoesNotExist:
            raise serializers.ValidationError("Mentor not found")
        
        return data

    def update(self, instance, validated_data):
        user = User.objects.get(email=validated_data['email'], is_mentor=True)
        user.set_password(validated_data['new_password'])
        user.otp = None  # Clear the OTP after successful password reset
        user.save()
        return user 


class MentorProfileUploadSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source='user.name')
    bio = serializers.CharField(source='user.bio', required=False, allow_blank=True)
    subjects = serializers.CharField(required=False, write_only=True)
    experience = serializers.CharField(source='user.experience', required=False)
    profile_image = serializers.ImageField(required=False)
    expertise_level = serializers.CharField(required=False)  
    
    class Meta:
        model = Mentor
        fields = [
            'name', 'bio', 'subjects', 'experience', 'expertise_level',
            'hourly_rate', 'profile_image', 'is_available', 
            'submitted_for_approval', 'approval_status', 'submitted_at', 
            'approved_at', 'approved_by','rejection_reason'
        ]
        read_only_fields = ['submitted_at', 'approved_at', 'approved_by','rejection_reason']
    
    def validate_subjects(self, value):
        """Validate and process the comma-separated subjects string"""
        if not value:
            return []
        
        # Split by comma and strip whitespace
        subject_names = [name.strip() for name in value.split(',') if name.strip()]
        
        if not subject_names:
            raise serializers.ValidationError("Please provide at least one subject")
            
        return subject_names
        
    def validate_expertise_level(self, value):
        """Ensure expertise level matches one of the valid choices"""
        if not value:
            return value
            
        valid_choices = dict(Mentor._meta.get_field('expertise_level').choices)
        
        # Convert to lowercase for comparison
        if value.lower() not in [choice.lower() for choice in valid_choices.keys()]:
            raise serializers.ValidationError(
                f"Expertise level must be one of: {', '.join(valid_choices.values())}"
            )
        
        # Return the lowercase version to match DB choices
        return value.lower()
        
    def validate_experience(self, value):
        """Convert experience to integer when possible"""
        try:
            # Try to extract just the number from strings like "5+ Years"
            if isinstance(value, str) and '+' in value:
                return int(value.split('+')[0])
            return int(value)
        except (ValueError, TypeError):
            return value
            
    @transaction.atomic
    def update(self, instance, validated_data):
        from django.utils import timezone
        
        user_data = validated_data.pop('user', {})
        subjects_data = validated_data.pop('subjects', [])
        profile_image = validated_data.pop('profile_image', None)
        
        # Update user model fields
        user = instance.user
        if 'name' in user_data:
            user.name = user_data['name']
        if 'bio' in user_data:
            user.bio = user_data['bio']
        if 'experience' in user_data:
            user.experience = user_data['experience']
            
        # Process subjects
        if subjects_data:
            subjects = []
            for subject_name in subjects_data:
                subject, created = Subject.objects.get_or_create(name=subject_name)
                subjects.append(subject)
            user.subjects.set(subjects)
            
        # Handle profile image upload
        if profile_image:
            try:
                upload_result = CloudinaryService.upload_image(profile_image)
                if upload_result:
                    # Set the CloudinaryField's value to the public_id from Cloudinary
                    instance.profile_image = upload_result['public_id']
            except Exception as e:
                logger.error(f"Error uploading profile image: {str(e)}")
                # Continue with the profile update even if the image upload fails
            
        # Update mentor model fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
            
        # Set submission for approval when profile is updated/created
        if not instance.submitted_for_approval:
            instance.submitted_for_approval = True
            instance.approval_status = 'pending'
            instance.submitted_at = timezone.now()
            
        # Log the expertise level value before saving
        logger.info(f"Setting expertise_level to: {instance.expertise_level}")
        
        # Save both models
        user.save()
        instance.save()
        
        return instance
        
    def to_representation(self, instance):
        """Format the response data to match frontend expectations"""
        subjects = instance.user.subjects.all()
        subject_names = ", ".join([subject.name for subject in subjects])
        
        representation = super().to_representation(instance)
        representation['subjects'] = subject_names
        
        # Format experience based on the value
        experience_val = instance.user.experience
        if isinstance(experience_val, int):
            representation['experience'] = f"{experience_val}+ Years"
        else:
            representation['experience'] = str(experience_val)
        
        # Add profile image URL - FIXED: Handle CloudinaryResource properly
        if instance.profile_image:
            # If it's a CloudinaryResource object, get the URL
            if hasattr(instance.profile_image, 'url'):
                representation['profile_image_url'] = instance.profile_image.url
            elif hasattr(instance.profile_image, 'build_url'):
                representation['profile_image_url'] = instance.profile_image.build_url()
            else:
                # If it's just a string (public_id), build the URL
                representation['profile_image_url'] = str(instance.profile_image)
        else:
            representation['profile_image_url'] = None
        
         
        if instance.expertise_level:
            representation['expertise_level'] = instance.get_expertise_level_display().title()
        
        
        representation['submitted_for_approval'] = instance.submitted_for_approval
        representation['approval_status'] = instance.approval_status
        representation['submitted_at'] = instance.submitted_at.isoformat() if instance.submitted_at else None
        representation['approved_at'] = instance.approved_at.isoformat() if instance.approved_at else None
        representation['rejection_reason'] = instance.rejection_reason
        if instance.approved_by:
            representation['approved_by'] = instance.approved_by.name
        else:
            representation['approved_by'] = None
    
        return representation

class MentorProfileDisplaySerializer(serializers.ModelSerializer):
    
    # User fields
    id = serializers.IntegerField(source='user.id', read_only=True)
    name = serializers.CharField(source='user.name', read_only=True)
    email = serializers.CharField(source='user.email', read_only=True)
    bio = serializers.CharField(source='user.bio', read_only=True)
    experience = serializers.SerializerMethodField()
    subjects = serializers.SerializerMethodField()
    
    # Mentor fields
    profile_image_url = serializers.SerializerMethodField()
    hourly_rate = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    rating = serializers.DecimalField(max_digits=3, decimal_places=2, read_only=True)
    expertise_level = serializers.CharField(read_only=True)
    rejection_reason = serializers.CharField(read_only=True, allow_blank=True)

    class Meta:
        model = Mentor
        fields = [
            'id', 'name', 'email', 'subjects', 'bio', 'experience', 
            'expertise_level', 'hourly_rate', 'availability', 'rating', 
            'total_sessions', 'total_students', 'is_available', 'profile_image_url','rejection_reason'
        ]

    def get_profile_image_url(self, obj):
        """Get profile image URL with fallback"""
        if obj.profile_image:
            if hasattr(obj.profile_image, 'url'):
                return obj.profile_image.url
            elif hasattr(obj.profile_image, 'build_url'):
                return obj.profile_image.build_url()
            else:
                return str(obj.profile_image)
        return "https://images.unsplash.com/photo-1649972904349-6e44c42644a7?w=300&h=300&fit=crop&crop=face"

    def get_experience(self, obj):
        """Format experience as string for display"""
        experience = obj.user.experience
        if experience == 0:
            return "Less than 1 Year"
        elif experience == 1:
            return "1 Year"
        else:
            return f"{experience}+ Years"

    def get_subjects(self, obj):
        """Return subjects as list of strings for frontend"""
        return [subject.name for subject in obj.user.subjects.all()]

class MentorProfileEditSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source='user.name')
    bio = serializers.CharField(source='user.bio', required=False, allow_blank=True)
    subjects = serializers.CharField(required=False, write_only=True)
    experience = serializers.CharField(source='user.experience', required=False)
    profile_image = serializers.ImageField(required=False)
    expertise_level = serializers.CharField(required=False)
    
    class Meta:
        model = Mentor
        fields = [
            'name', 'bio', 'subjects', 'experience', 'expertise_level',
            'hourly_rate', 'availability', 'profile_image', 'is_available'
        ]
    
    def validate_subjects(self, value):
        """Validate and process subjects - handle both string and list"""
        if not value:
            return []
        
        # Handle comma-separated string
        if isinstance(value, str):
            subject_names = [name.strip() for name in value.split(',') if name.strip()]
        # Handle list from frontend
        elif isinstance(value, list):
            subject_names = [str(name).strip() for name in value if str(name).strip()]
        else:
            subject_names = []
        
        if not subject_names:
            raise serializers.ValidationError("Please provide at least one subject")
            
        return subject_names
        
    def validate_expertise_level(self, value):
        """Ensure expertise level matches choices"""
        if not value:
            return value
            
        valid_choices = dict(Mentor._meta.get_field('expertise_level').choices)
        
        if value.lower() not in [choice.lower() for choice in valid_choices.keys()]:
            raise serializers.ValidationError(
                f"Expertise level must be one of: {', '.join(valid_choices.values())}"
            )
        
        return value.lower()
        
    def validate_experience(self, value):
        """Convert experience to integer"""
        try:
            if isinstance(value, str) and '+' in value:
                return int(value.split('+')[0])
            return int(value)
        except (ValueError, TypeError):
            return 0
    
    def validate_availability(self, value):
        """Validate availability schedule format"""
        if not value:
            return {}
            
        valid_days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
        
        if not isinstance(value, dict):
            raise serializers.ValidationError("Availability must be a dictionary")
        
        for day, slots in value.items():
            if day not in valid_days:
                raise serializers.ValidationError(f"Invalid day: {day}")
            
            if not isinstance(slots, list):
                raise serializers.ValidationError(f"Slots for {day} must be a list")
                
            # Validate time format (basic validation)
            for slot in slots:
                if not isinstance(slot, str) or ':' not in slot:
                    raise serializers.ValidationError(f"Invalid time format in {day}: {slot}")
        
        return value
            
    @transaction.atomic
    def update(self, instance, validated_data):
        user_data = validated_data.pop('user', {})
        subjects_data = validated_data.pop('subjects', [])
        profile_image = validated_data.pop('profile_image', None)
        
        # Update user model fields
        user = instance.user
        if 'name' in user_data:
            user.name = user_data['name']
        if 'bio' in user_data:
            user.bio = user_data['bio']
        if 'experience' in user_data:
            user.experience = user_data['experience']
            
        # Process subjects
        if subjects_data:
            subjects = []
            for subject_name in subjects_data:
                subject, created = Subject.objects.get_or_create(name=subject_name)
                subjects.append(subject)
            user.subjects.set(subjects)
            
        # Handle profile image upload
        if profile_image:
            try:
                upload_result = CloudinaryService.upload_image(profile_image)
                if upload_result:
                    instance.profile_image = upload_result['public_id']
            except Exception as e:
                logger.error(f"Error uploading profile image: {str(e)}")
                # Continue without failing the entire update
            
        # Update mentor model fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
            
        # Save both models
        user.save()
        instance.save()
        
        return instance
        
    def to_representation(self, instance):
        """Format response to match display serializer structure"""
        representation = {
            'id': instance.user.id,
            'name': instance.user.name,
            'email': instance.user.email,
            'bio': instance.user.bio,
            'subjects': [subject.name for subject in instance.user.subjects.all()],
            'experience': f"{instance.user.experience}+ Years" if instance.user.experience > 0 else "Less than 1 Year",
            'expertise_level': instance.expertise_level,
            'hourly_rate': float(instance.hourly_rate),
            'availability': instance.availability,
            'rating': float(instance.rating),
            'total_sessions': instance.total_sessions,
            'total_students': instance.total_students,
            'is_available': instance.is_available,
        }
        
        # Add profile image URL
        if instance.profile_image:
            if hasattr(instance.profile_image, 'url'):
                representation['profile_image_url'] = instance.profile_image.url
            elif hasattr(instance.profile_image, 'build_url'):
                representation['profile_image_url'] = instance.profile_image.build_url()
            else:
                representation['profile_image_url'] = str(instance.profile_image)
        else:
            representation['profile_image_url'] = "https://images.unsplash.com/photo-1649972904349-6e44c42644a7?w=300&h=300&fit=crop&crop=face"
        
        return representation

class MentorAvailabilitySerializer(serializers.ModelSerializer):
    """
    Serializer specifically for updating mentor availability
    """
    availability = serializers.JSONField()
    
    class Meta:
        model = Mentor
        fields = ['availability']
    
    def validate_availability(self, value):
        """
        Validate the availability JSON structure
        """
        if not isinstance(value, dict):
            raise serializers.ValidationError("Availability must be a dictionary")
        
        # Valid days
        valid_days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
        
        # Valid time slots
        valid_times = [
            "09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", "1:00 PM", "2:00 PM", 
            "3:00 PM", "4:00 PM", "5:00 PM", "6:00 PM", "7:00 PM", "8:00 PM"
        ]
        
        # Validate each day
        for day, times in value.items():
            if day not in valid_days:
                raise serializers.ValidationError(f"Invalid day: {day}")
            
            if not isinstance(times, list):
                raise serializers.ValidationError(f"Times for {day} must be a list")
            
            # Validate time slots
            for time in times:
                if not isinstance(time, str):
                    raise serializers.ValidationError(f"Time slots must be strings")
                if time not in valid_times:
                    raise serializers.ValidationError(f"Invalid time slot: {time}")
        
        return value
    
    def update(self, instance, validated_data):
        """
        Update the mentor's availability - completely replaces the existing availability
        """
        instance.availability = validated_data.get('availability', instance.availability)
        instance.save()
        return instance

class UserBasicSerializer(serializers.ModelSerializer):
    """Basic user serializer for nested relationships"""
    class Meta:
        model = User
        fields = ['id', 'name', 'email']

class SubjectSerializer(serializers.ModelSerializer):
    """Subject serializer"""
    class Meta:
        model = Subject
        fields = ['id', 'name']

class SessionReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = SessionReview
        fields = ['rating', 'review_text']

class MentorSessionSerializer(serializers.ModelSerializer):
    """Serializer for MentorSession with nested relationships"""
    student = UserBasicSerializer(read_only=True)
    mentor = serializers.SerializerMethodField()
    subjects = SubjectSerializer(many=True, read_only=True)
    review = SessionReviewSerializer(read_only=True)
    
    class Meta:
        model = MentorSession
        fields = [
            'id',
            'student',
            'mentor',
            'scheduled_date',
            'scheduled_time',
            'duration_minutes',
            'session_mode',
            'status',
            'meeting_link',
            'meeting_id',
            'meeting_password',
            'session_notes',
            'student_feedback',
            'mentor_feedback',
            'student_rating',
            'mentor_rating',
            'created_at',
            'updated_at',
            'confirmed_at',
            'started_at',
            'ended_at',
            'cancelled_at',
            'cancelled_by',
            'cancellation_reason',
            'subjects',
            'is_upcoming',
            'session_datetime',
            'review',
        ]
        read_only_fields = [
            'id',
            'created_at',
            'updated_at',
            'is_upcoming',
            'session_datetime',
        ]
    
    def get_mentor(self, obj):
        """Get mentor user details"""
        if obj.mentor and obj.mentor.user:
            return {
                'id': obj.mentor.user.id,
                'name': obj.mentor.user.name,
                'email': obj.mentor.user.email,
            }
        return None

class SessionDetailSerializer(serializers.ModelSerializer):
    student = UserBasicSerializer(read_only=True)
    subjects = SubjectSerializer(many=True, read_only=True)
    
    class Meta:
        model = MentorSession
        fields = [
            'id', 'student', 'scheduled_date', 'scheduled_time', 
            'duration_minutes', 'subjects'
        ]


class MentorEarningsSerializer(serializers.ModelSerializer):
    session = SessionDetailSerializer(read_only=True)
    is_cancelled = serializers.SerializerMethodField()

    class Meta:
        model = MentorEarnings
        fields = [
            'id', 'session', 'session_amount', 'platform_commission',
            'mentor_earning', 'payout_status', 'payout_date', 
            'payout_reference', 'created_at', 'updated_at', 'is_cancelled'
        ]

    def get_is_cancelled(self, obj):
        return obj.session.status == 'cancelled'


class WalletSummarySerializer(serializers.Serializer):
    total_earnings = serializers.DecimalField(max_digits=10, decimal_places=2)
    available_balance = serializers.DecimalField(max_digits=10, decimal_places=2)
    pending_earnings = serializers.DecimalField(max_digits=10, decimal_places=2)
    total_sessions = serializers.IntegerField()
    this_month_earnings = serializers.DecimalField(max_digits=10, decimal_places=2)


class MentorWalletSerializer(serializers.Serializer):
    wallet_summary = WalletSummarySerializer()
    earnings = MentorEarningsSerializer(many=True)
    earnings_count = serializers.IntegerField()

class MentorSessionReviewSerializer(serializers.ModelSerializer):
    session_id = serializers.IntegerField(source='session.id', read_only=True)
    scheduled_date = serializers.DateField(source='session.scheduled_date', read_only=True)
    scheduled_time = serializers.TimeField(source='session.scheduled_time', read_only=True)
    student = UserBasicSerializer(source='session.student', read_only=True)
    mentor = serializers.SerializerMethodField()

    class Meta:
        model = SessionReview
        fields = [
            'id',
            'session_id',
            'scheduled_date',
            'scheduled_time',
            'student',
            'mentor',
            'rating',
            'review_text',
            'created_at',
        ]

    def get_mentor(self, obj):
        mentor = getattr(obj.session, 'mentor', None)
        if mentor and hasattr(mentor, 'user'):
            return {
                'id': mentor.user.id,
                'name': mentor.user.name,
                'email': mentor.user.email,
            }
        return None