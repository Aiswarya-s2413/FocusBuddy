from rest_framework import serializers
from .models import *
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken
import random
from django.utils import timezone
import logging

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
        if not User.objects.filter(email=value).exists():
            raise serializers.ValidationError("No user found with this email address.")
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
