from rest_framework import serializers
from userapp.models import *
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.models import User as DjangoUser
from django.contrib.auth import authenticate, get_user_model

User = get_user_model()

class AdminLoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)
    
    def validate(self, data):
        email = data.get('email')
        password = data.get('password')
        
        if email and password:
            # Authenticate using email as username
            user = authenticate(request=self.context.get('request'), email=email, password=password)
            
            if user:
                # Check if user has admin privileges
                if not (user.is_staff or user.is_superuser):
                    raise serializers.ValidationError("Access denied. Admin privileges required.")
                
                if not user.is_active:
                    raise serializers.ValidationError("User account is disabled.")
                
                data['user'] = user
                return data
            else:
                raise serializers.ValidationError("Invalid email or password")
        else:
            raise serializers.ValidationError("Must include email and password")
class UserListSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'name', 'is_active', 'date_joined', 'last_login']

class UserEditSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['email', 'name', 'is_active']
        
    def validate_email(self, value):
        # Check if email is already taken by another user
        if User.objects.filter(email=value).exclude(id=self.instance.id if self.instance else None).exists():
            raise serializers.ValidationError("This email is already in use.")
        return value 

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'name', 'email']

class JournalListSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = Journal
        fields = ['id', 'user', 'mood', 'date',  'created_at', 'is_blocked']

class JournalDetailSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = Journal
        fields = ['id', 'user', 'mood', 'description', 'date', 'created_at', 'updated_at', 'is_blocked']

class MentorApprovalSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source='user.name', read_only=True)
    email = serializers.CharField(source='user.email', read_only=True)
    bio = serializers.CharField(source='user.bio', read_only=True)
    subjects = serializers.CharField(source='user.subjects', read_only=True)
    experience = serializers.CharField(source='user.experience', read_only=True)
    profile_image_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Mentor
        fields = [
            'id', 'name', 'email', 'bio', 'subjects', 'experience',
            'expertise_level', 'hourly_rate', 'approval_status',
            'submitted_at', 'approved_at', 'profile_image_url','rejection_reason'
        ]
    
    def get_profile_image_url(self, obj):
        if obj.profile_image:
            return obj.profile_image.url
        return None

class MentorDetailSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source='user.name', read_only=True)
    email = serializers.CharField(source='user.email', read_only=True)
    bio = serializers.CharField(source='user.bio', read_only=True)
    subjects = serializers.CharField(source='user.subjects', read_only=True)
    experience = serializers.CharField(source='user.experience', read_only=True)
    profile_image_url = serializers.SerializerMethodField()
    approved_by_name = serializers.CharField(source='approved_by.name', read_only=True)
    
    class Meta:
        model = Mentor
        fields = [
            'id', 'name', 'email', 'bio', 'subjects', 'experience',
            'expertise_level', 'hourly_rate', 'approval_status',
            'submitted_at', 'approved_at', 'profile_image_url',
            'approved_by_name', 'rating', 'total_sessions', 'total_students','rejection_reason'
        ]
    
    def get_profile_image_url(self, obj):
        if obj.profile_image:
            return obj.profile_image.url
        return None
