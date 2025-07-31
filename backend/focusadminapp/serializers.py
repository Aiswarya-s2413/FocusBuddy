from rest_framework import serializers
from userapp.models import *
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.models import User as DjangoUser
from django.contrib.auth import authenticate, get_user_model
from django.db.models import Count, Sum, Avg
from django.utils import timezone
from datetime import datetime, timedelta

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
        fields = ['id', 'email', 'name', 'is_active', 'date_joined', 'last_login', 'is_mentor']

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

class SessionDetailSerializer(serializers.ModelSerializer):
    student = UserBasicSerializer(read_only=True)
    subjects = SubjectSerializer(many=True, read_only=True)
    
    class Meta:
        model = MentorSession
        fields = [
            'id', 'student', 'scheduled_date', 'scheduled_time', 
            'duration_minutes', 'subjects'
        ]


class AdminEarningsSerializer(serializers.ModelSerializer):
    session = SessionDetailSerializer(read_only=True)
    mentor_name = serializers.CharField(source='mentor.user.get_full_name', read_only=True)
    student_name = serializers.CharField(source='session.student.name', read_only=True)
    
    class Meta:
        model = MentorEarnings
        fields = [
            'id', 'session', 'mentor_name', 'student_name', 'session_amount', 
            'platform_commission', 'mentor_earning', 'payout_status', 
            'payout_date', 'payout_reference', 'created_at', 'updated_at'
        ]


class AdminWalletSummarySerializer(serializers.Serializer):
    total_platform_commission = serializers.DecimalField(max_digits=10, decimal_places=2)
    available_balance = serializers.DecimalField(max_digits=10, decimal_places=2)
    pending_commissions = serializers.DecimalField(max_digits=10, decimal_places=2)
    total_sessions = serializers.IntegerField()
    this_month_commission = serializers.DecimalField(max_digits=10, decimal_places=2)
    total_mentors = serializers.IntegerField()
    total_students = serializers.IntegerField()


class AdminWalletSerializer(serializers.Serializer):
    wallet_summary = AdminWalletSummarySerializer()
    earnings = AdminEarningsSerializer(many=True)
    earnings_count = serializers.IntegerField()
    pagination = serializers.DictField()

class FocusBuddySessionSerializer(serializers.ModelSerializer):
    creator_id = UserBasicSerializer(read_only=True)
    remaining_time_display = serializers.SerializerMethodField()
    participant_count = serializers.SerializerMethodField()
    is_expired = serializers.SerializerMethodField()
    can_join = serializers.SerializerMethodField()
    
    class Meta:
        model = FocusBuddySession
        fields = [
            'id', 'creator_id', 'title', 'session_type', 'status', 
            'duration_minutes', 'max_participants', 'participant_count',
            'started_at', 'ends_at', 'ended_at', 'created_at', 'updated_at',
            'remaining_time_display', 'is_expired', 'can_join'
        ]
    
    def get_remaining_time_display(self, obj):
        """Get human-readable remaining time"""
        if obj.status != 'active':
            return None
        
        remaining_seconds = obj.remaining_time_seconds
        if remaining_seconds <= 0:
            return "Expired"
        
        minutes = remaining_seconds // 60
        seconds = remaining_seconds % 60
        
        if minutes > 0:
            return f"{minutes}m {seconds}s"
        else:
            return f"{seconds}s"
    
    def get_participant_count(self, obj):
        """Get current participant count"""
        return obj.participant_count
    
    def get_is_expired(self, obj):
        """Check if session is expired"""
        return obj.is_expired
    
    def get_can_join(self, obj):
        """Check if session can be joined"""
        return obj.can_join

class FocusBuddySessionDetailSerializer(serializers.ModelSerializer):
    creator_id = UserBasicSerializer(read_only=True)
    participants = serializers.SerializerMethodField()
    session_stats = serializers.SerializerMethodField()
    
    class Meta:
        model = FocusBuddySession
        fields = [
            'id', 'creator_id', 'title', 'session_type', 'status', 
            'duration_minutes', 'max_participants', 'started_at', 
            'ends_at', 'ended_at', 'created_at', 'updated_at',
            'participants', 'session_stats'
        ]
    
    
    def get_session_stats(self, obj):
        """Get session statistics"""
        return {
            'total_duration_minutes': obj.duration_minutes,
            'actual_duration_minutes': self._calculate_actual_duration(obj),
            'participant_count': obj.participant_count,
            'max_participants': obj.max_participants,
            'utilization_rate': (obj.participant_count / obj.max_participants * 100) if obj.max_participants > 0 else 0
        }
    
    def _calculate_actual_duration(self, obj):
        """Calculate actual session duration in minutes"""
        if obj.ended_at and obj.started_at:
            delta = obj.ended_at - obj.started_at
            return int(delta.total_seconds() / 60)
        elif obj.status == 'active':
            from django.utils import timezone
            delta = timezone.now() - obj.started_at
            return int(delta.total_seconds() / 60)
        return obj.duration_minutes

class AdminMetricsSerializer(serializers.Serializer):
    """Serializer for key platform metrics"""
    registered_users = serializers.IntegerField()
    approved_mentors = serializers.IntegerField()
    total_focus_sessions = serializers.IntegerField()
    total_mentor_sessions = serializers.IntegerField()
    pending_mentor_approvals = serializers.IntegerField()


class UsageDataSerializer(serializers.Serializer):
    """Serializer for usage graph data"""
    period = serializers.CharField()  # 'daily' or 'weekly'
    data = serializers.ListField(
        child=serializers.DictField()
    )


class RecentActivitySerializer(serializers.Serializer):
    """Serializer for recent activity feed"""
    id = serializers.IntegerField()
    user = serializers.CharField()
    action = serializers.CharField()
    time = serializers.CharField()
    type = serializers.CharField()


class AdminDashboardSerializer(serializers.Serializer):
    """Combined serializer for all admin dashboard data"""
    metrics = AdminMetricsSerializer()
    usage_data = UsageDataSerializer()
    recent_activities = RecentActivitySerializer(many=True)


class UserActivitySerializer(serializers.ModelSerializer):
    """Serializer for user activity details"""
    total_focus_sessions = serializers.IntegerField(read_only=True)
    total_mentor_sessions = serializers.IntegerField(read_only=True)
    total_tasks = serializers.IntegerField(read_only=True)
    total_journal_entries = serializers.IntegerField(read_only=True)
    is_mentor = serializers.BooleanField()
    last_login = serializers.DateTimeField(read_only=True)
    
    class Meta:
        model = User
        fields = [
            'id', 'name', 'email', 'date_joined', 'is_active',
            'is_mentor', 'total_focus_sessions', 'total_mentor_sessions',
            'total_tasks', 'total_journal_entries', 'last_login'
        ]



class PlatformStatsSerializer(serializers.Serializer):
    """Serializer for detailed platform statistics"""
    total_users = serializers.IntegerField()
    active_users_today = serializers.IntegerField()
    active_users_week = serializers.IntegerField()
    active_users_month = serializers.IntegerField()
    
    total_mentors = serializers.IntegerField()
    active_mentors = serializers.IntegerField()
    pending_mentors = serializers.IntegerField()
    
    total_sessions = serializers.IntegerField()
    completed_sessions = serializers.IntegerField()
    cancelled_sessions = serializers.IntegerField()
    
    total_focus_sessions = serializers.IntegerField()
    active_focus_sessions = serializers.IntegerField()
    
    total_tasks = serializers.IntegerField()
    completed_tasks = serializers.IntegerField()
    
    total_journal_entries = serializers.IntegerField()
    journal_entries_today = serializers.IntegerField()
    
    avg_session_rating = serializers.DecimalField(max_digits=3, decimal_places=2)
    total_revenue = serializers.DecimalField(max_digits=10, decimal_places=2)

class MentorReportListSerializer(serializers.ModelSerializer):
    mentor_id = serializers.IntegerField(source='mentor.user.id', read_only=True)
    mentor_name = serializers.CharField(source='mentor.user.name', read_only=True)
    mentor_email = serializers.CharField(source='mentor.user.email', read_only=True)
    mentor_is_active = serializers.BooleanField(source='mentor.user.is_active', read_only=True)
    reporter_name = serializers.CharField(source='reporter.name', read_only=True)
    reporter_email = serializers.CharField(source='reporter.email', read_only=True)
    session_id = serializers.SerializerMethodField()

    class Meta:
        model = MentorReport
        fields = [
            'id', 'mentor_id', 'mentor_name', 'mentor_email', 'mentor_is_active',
            'reporter_name', 'reporter_email', 'session_id', 'reason', 'created_at'
        ]

    def get_session_id(self, obj):
        return obj.session.id if obj.session else None