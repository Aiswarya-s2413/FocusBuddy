from rest_framework import serializers
from userapp.models import User, Subject
from rest_framework_simplejwt.tokens import RefreshToken
import random
from django.core.mail import send_mail
from django.conf import settings
import logging
from django.utils import timezone

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

class MentorProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'name', 'email', 'subjects', 'bio', 'experience']
        read_only_fields = ['email']  # Email cannot be changed 

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