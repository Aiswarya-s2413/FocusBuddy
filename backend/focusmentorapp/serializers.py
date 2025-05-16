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
    expertise_level = serializers.CharField(required=False)  # Make sure this field is explicitly defined
    
    class Meta:
        model = Mentor
        fields = [
            'name', 'bio', 'subjects', 'experience', 'expertise_level',
            'hourly_rate', 'profile_image', 'is_available'
        ]
    
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
        
        # Add profile image URL
        representation['profile_image_url'] = (
            instance.profile_image.url if instance.profile_image else None
        )
        
        # Set expertise level to match frontend format (capitalized)
        if instance.expertise_level:
            representation['expertise_level'] = instance.get_expertise_level_display().title()
        
        return representation