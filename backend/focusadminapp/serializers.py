from rest_framework import serializers
from userapp.models import User
from rest_framework_simplejwt.tokens import RefreshToken

class AdminLoginSerializer(serializers.Serializer):
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

        if not user.is_staff:
            raise serializers.ValidationError("Not authorized as admin")

        refresh = RefreshToken.for_user(user)
        return {
            "access": str(refresh.access_token),
            "refresh": str(refresh),
            "user": {
                "id": user.id,
                "name": user.name,
                "email": user.email,
                "is_staff": user.is_staff
            }
        }

class UserListSerializer(serializers.ModelSerializer):
    subjects = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'name', 'email', 'phone', 'is_active', 'is_verified', 'date_joined', 'subjects']
        read_only_fields = ['id', 'email', 'date_joined']

    def get_subjects(self, obj):
        # Get all subjects for the user
        subjects = obj.subjects.all()
        return [subject.name for subject in subjects]

class UserEditSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['name', 'phone', 'is_active'] 