from rest_framework import serializers
from userapp.models import User
from rest_framework_simplejwt.tokens import RefreshToken

class MentorSignupSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    name = serializers.CharField(max_length=255)
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
        # Create user with is_mentor flag
        user = User.objects.create_user(
            email=validated_data['email'],
            password=validated_data['password'],
            name=validated_data['name'],
            is_mentor=True
        )
        
        # Add additional mentor fields if provided
        if 'subjects' in validated_data:
            user.subjects = validated_data['subjects']
        if 'bio' in validated_data:
            user.bio = validated_data['bio']
        if 'experience' in validated_data:
            user.experience = validated_data['experience']
        
        user.save()
        return user

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
                "subjects": user.subjects,
                "bio": user.bio,
                "experience": user.experience
            }
        }

class MentorProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'name', 'email', 'subjects', 'bio', 'experience']
        read_only_fields = ['email']  # Email cannot be changed 