from .models import *
from .serializers import *
from django.core.mail import send_mail
from django.conf import settings
import logging
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from django.utils import timezone
import random
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db.models import Q
from rest_framework.pagination import PageNumberPagination
import razorpay
from django.conf import settings
from django.db.models import Count
from django.db import IntegrityError
from rest_framework.exceptions import ValidationError
from .combine import *
from django.contrib.auth import update_session_auth_hash
from .serializers import CancelSessionSerializer
from decimal import Decimal
from .models import WalletTransaction
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth import authenticate, login, logout
from django.db.models import Q, Count, Avg, Sum, F
from django.utils import timezone
from datetime import datetime, timedelta
import json



logger = logging.getLogger(__name__)

def notify_mentor(mentor_user_id, message):
    print(f"[notify_mentor] Called for user {mentor_user_id} with message: {message}")
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        f"mentor_notify_{mentor_user_id}",
        {
            "type": "send_notification",
            "content": message
        }
    )

class SignupView(APIView):
    permission_classes=[]
    authentication_classes=[]
    def post(self, request):
        logger.info("Received signup request with data: %s", request.data)
        serializer = SignupSerializer(data=request.data)
        
        if serializer.is_valid():
            logger.info("Serializer is valid, proceeding with user creation")
            try:
                user = serializer.save()
                otp = user.otp
                print(f"OTP: {otp}")
                logger.info(f"User created/updated successfully: {user.email}")
                
                try:
                    # send otp via email
                    send_mail(
                        subject="Your FocusBuddy OTP",
                        message=f"Hello {user.name}, your OTP is {otp}",
                        from_email=settings.DEFAULT_FROM_EMAIL,
                        recipient_list=[user.email],
                        fail_silently=False,
                    )
                    logger.info("OTP email sent successfully to %s", user.email)
                    return Response({
                        "message": "OTP sent to your email",
                        "is_resignup": not user.is_verified
                    }, status=status.HTTP_201_CREATED)
                except Exception as e:
                    logger.error("Failed to send OTP email: %s", str(e))
                    # Delete the user if email sending fails
                    user.delete()
                    return Response(
                        {"error": "Failed to send OTP email. Please try again."},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR
                    )
            except serializers.ValidationError as e:
                logger.error("Validation error during user creation: %s", str(e))
                return Response(e.detail, status=status.HTTP_400_BAD_REQUEST)
            except Exception as e:
                logger.error("Unexpected error during user creation: %s", str(e))
                return Response(
                    {"error": "An unexpected error occurred. Please try again."},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        
        logger.warning("Serializer validation failed: %s", serializer.errors)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class OtpVerifyView(APIView):
    permission_classes=[]
    authentication_classes=[]
    def post(self, request):
        serializer = OtpVerifySerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            otp = serializer.validated_data['otp']
            try:
                user = User.objects.get(email=email, otp=otp)
                
                # Check if OTP has expired (1 minute)
                if user.otp_created_at and (timezone.now() - user.otp_created_at).total_seconds() > 60:
                    user.otp = None
                    user.otp_created_at = None
                    user.save()
                    return Response({"error": "OTP has expired. Please request a new one."}, status=status.HTTP_400_BAD_REQUEST)
                
                user.is_verified = True
                user.otp = None  # Clear the OTP after successful verification
                user.otp_created_at = None
                user.save()
                return Response({"message": "OTP verified"}, status=status.HTTP_200_OK)
            except User.DoesNotExist:
                return Response({"error": "Invalid Email or OTP"}, status=status.HTTP_400_BAD_REQUEST)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class ResendOtpView(APIView):
    permission_classes=[]
    authentication_classes=[]
    def post(self, request):
        email = request.data.get('email')
        try:
            user = User.objects.get(email=email)
            otp = f"{random.randint(100000, 999999)}"
            print(f"OTP: {otp}")
            user.otp = otp
            user.otp_created_at = timezone.now()  # Set OTP creation time
            user.save()

            send_mail(
                subject="Your new OTP",
                message=f"Hello {user.name}, your new OTP is {otp}",
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=False,
            )
            return Response({"message": "OTP resent successfully"}, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response({"error": "User not found"}, status=status.HTTP_400_BAD_REQUEST)


class SelectSubjectsView(APIView):
    permission_classes=[]
    authentication_classes=[]
    def get(self, request):
        subjects = Subject.objects.all()
        serializer = SubjectSerializer(subjects, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        serializer = SubjectSelectionSerializer(data=request.data)
        if serializer.is_valid():
            try:
                user = User.objects.get(email=serializer.validated_data['email'], is_verified=True)
                subject_ids = serializer.validated_data['subjects']
                subjects = Subject.objects.filter(id__in=subject_ids)
                user.subjects.set(subjects)
                return Response({"message": "Subjects added and user registered"}, status=status.HTTP_200_OK)
            except User.DoesNotExist:
                return Response({"error": "User not found or not verified"}, status=status.HTTP_400_BAD_REQUEST)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class LoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes=[]
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            data = serializer.validated_data
            response = Response({"message": "Login successful", "user": data["user"]}, status=status.HTTP_200_OK)
            # Set JWT tokens in HttpOnly cookies
            response.set_cookie(
                "access", data["access"], httponly=False, 
                secure=False, samesite='Lax', path="/"
            )
            response.set_cookie(
                "refresh", data["refresh"], httponly=False, 
                secure=False, samesite='Lax', path="/"
            )
            return response
        logger.warning("Login failed with errors: %s", serializer.errors)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class GoogleAuthView(APIView):
    permission_classes = []
    authentication_classes = []
    
    def post(self, request):
        logger.info("Received Google auth request")
        serializer = GoogleAuthSerializer(data=request.data)
        
        if serializer.is_valid():
            try:
                data = serializer.save()
                
                response_data = {
                    "message": "Google authentication successful",
                    "user": data["user"],
                    "is_new_user": data["is_new_user"],
                    "needs_subjects": data["needs_subjects"]
                }
                
                response = Response(response_data, status=status.HTTP_200_OK)
                
                # Set JWT tokens in HttpOnly cookies
                response.set_cookie(
                    "access", data["access"], httponly=False, 
                    secure=False, samesite='Lax', path="/"
                )
                response.set_cookie(
                    "refresh", data["refresh"], httponly=False, 
                    secure=False, samesite='Lax', path="/"
                )
                
                logger.info(f"Google auth successful for user: {data['user']['email']}")
                return response
                
            except Exception as e:
                logger.error(f"Google auth error: {str(e)}")
                return Response(
                    {"error": "Google authentication failed. Please try again."},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        
        logger.warning("Google auth validation failed: %s", serializer.errors)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class ForgotPasswordView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    
    def post(self, request):
        logger.info("Received forgot password request with data: %s", request.data)
        serializer = ForgotPasswordSerializer(data=request.data)
        
        if serializer.is_valid():
            logger.info("Serializer is valid, proceeding with OTP generation")
            try:
                user = serializer.save()
                otp = user.otp
                print(f"OTP: {otp}")
                logger.info(f"OTP generated successfully for user: {user.email}")
                
                try:
                    # Send OTP via email
                    send_mail(
                        subject="Your FocusBuddy Password Reset OTP",
                        message=f"Hello {user.name}, your password reset OTP is {otp}.",
                        from_email=settings.DEFAULT_FROM_EMAIL,
                        recipient_list=[user.email],
                        fail_silently=False,
                    )
                    logger.info("Password reset OTP email sent successfully to %s", user.email)
                    return Response({
                        "message": "OTP has been sent to your email"
                    }, status=status.HTTP_200_OK)
                    
                except Exception as e:
                    logger.error("Failed to send password reset OTP email: %s", str(e))
                    return Response(
                        {"error": "Failed to send OTP email. Please try again."},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR
                    )
                    
            except serializers.ValidationError as e:
                logger.error("Validation error during forgot password: %s", str(e))
                return Response(e.detail, status=status.HTTP_400_BAD_REQUEST)
            except Exception as e:
                logger.error("Unexpected error during forgot password: %s", str(e))
                return Response(
                    {"error": "An unexpected error occurred. Please try again."},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        
        logger.warning("Serializer validation failed: %s", serializer.errors)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class VerifyForgotPasswordOTPView(APIView):
    permission_classes = [AllowAny]
    authentication_classes=[]
    def post(self, request):
        serializer = VerifyForgotPasswordOTPSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            otp = serializer.validated_data['otp']
            try:
                user = User.objects.get(email=email)
                
                # Check if OTP has expired (1 minute)
                if user.otp_created_at and (timezone.now() - user.otp_created_at).total_seconds() > 60:
                    user.otp = None
                    user.otp_created_at = None
                    user.save()
                    return Response({"error": "OTP has expired. Please request a new one."}, status=status.HTTP_400_BAD_REQUEST)
                
                if user.otp != otp:
                    return Response({"error": "Invalid OTP"}, status=status.HTTP_400_BAD_REQUEST)
                
                return Response({"message": "OTP verified successfully"}, status=status.HTTP_200_OK)
            except User.DoesNotExist:
                return Response({"error": "User not found"}, status=status.HTTP_400_BAD_REQUEST)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class ResetPasswordView(APIView):
    permission_classes = [AllowAny]
    authentication_classes=[]
    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            otp = serializer.validated_data['otp']
            new_password = serializer.validated_data['new_password']
            
            try:
                user = User.objects.get(email=email)
                
                # Check if OTP has expired (1 minute)
                if user.otp_created_at and (timezone.now() - user.otp_created_at).total_seconds() > 60:
                    user.otp = None
                    user.otp_created_at = None
                    user.save()
                    return Response({"error": "OTP has expired. Please request a new one."}, status=status.HTTP_400_BAD_REQUEST)
                
                if user.otp != otp:
                    return Response({"error": "Invalid OTP"}, status=status.HTTP_400_BAD_REQUEST)
                
                user.set_password(new_password)
                user.otp = None  # Clear the OTP after successful password reset
                user.otp_created_at = None
                user.save()
                return Response({"message": "Password reset successfully"}, status=status.HTTP_200_OK)
            except User.DoesNotExist:
                return Response({"error": "User not found"}, status=status.HTTP_400_BAD_REQUEST)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class LogoutView(APIView):
    

    def post(self, request):
        response = Response({"message": "Logged out successfully"}, status=status.HTTP_200_OK)
        
        # Clear the JWT cookies with exact same parameters as when setting them
        response.delete_cookie(
            'access', 
            path='/',
            samesite='Lax'
        )
        response.delete_cookie(
            'refresh', 
            path='/',
            samesite='Lax'
        )
        
        # For debugging
        print("Clearing cookies:", request.COOKIES)
        
        return response


class UpdateProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        return Response({
            "id": user.id,
            "name": user.name,
            "email": user.email,
        }, status=status.HTTP_200_OK)

    def put(self, request):
        try:
            # Get token from cookies
            access_token = request.COOKIES.get('access')

            if not access_token:
                return Response(
                    {"error": "Authentication credentials were not provided."},
                    status=status.HTTP_401_UNAUTHORIZED
                )

            try:
                # Validate token
                AccessToken(access_token)
            except (InvalidToken, TokenError):
                return Response(
                    {"error": "Invalid or expired token."},
                    status=status.HTTP_401_UNAUTHORIZED
                )

            user = request.user
            new_name = request.data.get('name')

            if not new_name:
                return Response(
                    {"error": "Name is required"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            user.name = new_name
            user.save()

            return Response(
                {"message": "Profile updated successfully", "user": {"name": user.name, "email": user.email}},
                status=status.HTTP_200_OK
            )

        except Exception as e:
            return Response(
                {"error": f"An error occurred: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class CheckUserStatusView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email')
        if not email:
            return Response(
                {"error": "Email is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            user = User.objects.get(email=email)
            return Response({
                "exists": True,
                "is_verified": user.is_verified,
                "message": "User found",
                "can_resignup": not user.is_verified,
                "user": {
                    "name": user.name,
                    "email": user.email,
                    "phone": user.phone
                }
            }, status=status.HTTP_200_OK)
        except User.DoesNotExist:
            return Response({
                "exists": False,
                "is_verified": False,
                "message": "User not found",
                "can_resignup": True
            }, status=status.HTTP_200_OK)


# Task List & Create
class TaskListCreateAPIView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = TaskSerializer

    def get_queryset(self):
        return Task.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

# Task Retrieve, Update, Delete
class TaskDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = TaskSerializer

    def get_queryset(self):
        return Task.objects.filter(user=self.request.user)

# Custom: Complete Pomodoro
class CompletePomodoroAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        task = get_object_or_404(Task, pk=pk, user=request.user)
        task.completed_pomodoros += 1
        if task.completed_pomodoros >= task.estimated_pomodoros:
            task.is_completed = True
        task.save()
        return Response({'status': 'pomodoro completed'}, status=status.HTTP_200_OK)

# PomodoroSession List & Create
class PomodoroSessionListCreateAPIView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = PomodoroSessionSerializer

    def get_queryset(self):
        return PomodoroSession.objects.filter(task__user=self.request.user)

# PomodoroSession Retrieve, Update, Delete
class PomodoroSessionDetailAPIView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = PomodoroSessionSerializer

    def get_queryset(self):
        return PomodoroSession.objects.filter(task__user=self.request.user)

# Custom: Complete Session
class CompleteSessionAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        session = get_object_or_404(PomodoroSession, pk=pk, task__user=request.user)
        session.end_time = timezone.now()
        session.is_completed = True
        session.save()
        return Response({'status': 'session completed'}, status=status.HTTP_200_OK)

# Retrieve or Update PomodoroSettings
class PomodoroSettingsAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        print(request.headers.get("Authorization"))

        print("User:", request.user)
        settings, created = PomodoroSettings.objects.get_or_create(user=request.user)
        serializer = PomodoroSettingsSerializer(settings)
        return Response(serializer.data)

    def put(self, request):
        settings, created = PomodoroSettings.objects.get_or_create(user=request.user)
        serializer = PomodoroSettingsSerializer(settings, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request):
        settings, created = PomodoroSettings.objects.get_or_create(user=request.user)
        serializer = PomodoroSettingsSerializer(settings, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class JournalAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, journal_id=None):
        if journal_id:
            journal = get_object_or_404(Journal, id=journal_id, user=request.user)
            serializer = JournalSerializer(journal)
            return Response(serializer.data)
        else:
            journals = Journal.objects.filter(user=request.user).order_by('-date')
            serializer = JournalSerializer(journals, many=True)
            return Response(serializer.data)

    def post(self, request):
        serializer = JournalSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(user=request.user)  # associate the user automatically
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def put(self, request, journal_id):
        journal = get_object_or_404(Journal, id=journal_id, user=request.user)
        serializer = JournalSerializer(journal, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request, journal_id):
        journal = get_object_or_404(Journal, id=journal_id, user=request.user)
        serializer = JournalSerializer(journal, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, journal_id):
        journal = get_object_or_404(Journal, id=journal_id, user=request.user)
        journal.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

class MoodChoicesAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        moods = [{'key': key, 'label': label} for key, label in Journal.MOOD_CHOICES]
        return Response(moods)

class MentorListAPIView(APIView):
    
    def get(self, request):
        try:
            logger.info(f"Mentor list request with params: {request.query_params}")
            
            # Get query parameters with better validation
            search_query = request.query_params.get('search', '').strip()
            subjects_param = request.query_params.get('subjects', '').strip()
            expertise_levels = request.query_params.getlist('expertise_level')
            min_rating = request.query_params.get('rating', '0')
            min_hourly_rate = request.query_params.get('min_hourly_rate', '0')
            max_hourly_rate = request.query_params.get('max_hourly_rate', '1000')
            
            logger.info(f"Parsed params - search: '{search_query}', subjects: '{subjects_param}', "
                       f"expertise: {expertise_levels}, rating: '{min_rating}', "
                       f"rate_range: '{min_hourly_rate}'-'{max_hourly_rate}'")
            
            # Base queryset - only approved mentors
            mentors = Mentor.objects.filter(
                is_approved=True,
                approval_status='approved'
            ).select_related('user').prefetch_related('user__subjects')
            
            logger.info(f"Base queryset count: {mentors.count()}")
            
            # Apply search filter
            if search_query:
                try:
                    mentors = mentors.filter(
                        Q(user__name__icontains=search_query) |
                        Q(user__bio__icontains=search_query) |
                        Q(user__subjects__name__icontains=search_query)
                    ).distinct()
                    logger.info(f"After search filter count: {mentors.count()}")
                except Exception as e:
                    logger.error(f"Error applying search filter: {e}")
                    # Continue without search filter rather than failing
            
            # Apply subject filter
            if subjects_param:
                try:
                    subject_names = [s.strip() for s in subjects_param.split(',') if s.strip()]
                    if subject_names:
                        logger.info(f"Filtering by subjects: {subject_names}")
                        mentors = mentors.filter(
                            user__subjects__name__in=subject_names
                        ).distinct()
                        logger.info(f"After subject filter count: {mentors.count()}")
                except Exception as e:
                    logger.error(f"Error applying subject filter: {e}")
                    # Continue without subject filter
            
            # Apply expertise level filter
            if expertise_levels:
                try:
                    # Clean the expertise levels
                    clean_levels = [level.strip() for level in expertise_levels if level.strip()]
                    if clean_levels:
                        logger.info(f"Filtering by expertise levels: {clean_levels}")
                        mentors = mentors.filter(expertise_level__in=clean_levels)
                        logger.info(f"After expertise filter count: {mentors.count()}")
                except Exception as e:
                    logger.error(f"Error applying expertise filter: {e}")
                    # Continue without expertise filter
            
            # Apply rating filter
            try:
                min_rating_val = float(min_rating) if min_rating else 0
                if min_rating_val > 0:
                    logger.info(f"Filtering by min rating: {min_rating_val}")
                    mentors = mentors.filter(rating__gte=min_rating_val)
                    logger.info(f"After rating filter count: {mentors.count()}")
            except (ValueError, TypeError) as e:
                logger.warning(f"Invalid min_rating value '{min_rating}': {e}")
                # Continue without rating filter
            
            # Apply hourly rate filter
            try:
                min_rate = float(min_hourly_rate) if min_hourly_rate else 0
                max_rate = float(max_hourly_rate) if max_hourly_rate else 1000
                
                logger.info(f"Filtering by rate range: {min_rate} - {max_rate}")
                mentors = mentors.filter(
                    hourly_rate__gte=min_rate,
                    hourly_rate__lte=max_rate
                )
                logger.info(f"After rate filter count: {mentors.count()}")
            except (ValueError, TypeError) as e:
                logger.warning(f"Invalid hourly rate values '{min_hourly_rate}'-'{max_hourly_rate}': {e}")
                # Continue without rate filter
            
            # Limit results to prevent timeouts
            mentors = mentors[:100]  # Limit to 100 mentors
            
            # Serialize the data
            try:
                serializer = MentorSerializer(mentors, many=True)
                serialized_data = serializer.data
                logger.info(f"Successfully serialized {len(serialized_data)} mentors")
            except Exception as e:
                logger.error(f"Serialization error: {e}")
                return Response({
                    'success': False,
                    'error': 'Error processing mentor data'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            return Response({
                'success': True,
                'count': len(serialized_data),
                'data': serialized_data
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Unexpected error in MentorListAPIView: {e}", exc_info=True)
            return Response({
                'success': False,
                'error': 'An unexpected error occurred while fetching mentors'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class MentorDetailAPIView(APIView):
    
    def get(self, request, mentor_id):
        try:
            logger.info(f"Fetching mentor details for ID: {mentor_id}")
            
            # Validate mentor_id
            try:
                mentor_id = int(mentor_id)
            except (ValueError, TypeError):
                logger.warning(f"Invalid mentor_id format: {mentor_id}")
                return Response({
                    'success': False,
                    'error': 'Invalid mentor ID format'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            try:
                mentor = Mentor.objects.select_related('user').prefetch_related(
                    'user__subjects'
                ).get(
                    id=mentor_id,
                    is_approved=True,
                    approval_status='approved'
                )
                logger.info(f"Found mentor: {mentor.user.name}")
            except Mentor.DoesNotExist:
                logger.warning(f"Mentor not found or not approved: {mentor_id}")
                return Response({
                    'success': False,
                    'error': 'Mentor not found or not approved'
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Serialize the mentor
            try:
                serializer = MentorSerializer(mentor)
                serialized_data = serializer.data
                logger.info(f"Successfully serialized mentor {mentor_id}")
            except Exception as e:
                logger.error(f"Serialization error for mentor {mentor_id}: {e}")
                return Response({
                    'success': False,
                    'error': 'Error processing mentor data'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            return Response({
                'success': True,
                'data': serialized_data
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Unexpected error in MentorDetailAPIView for ID {mentor_id}: {e}", exc_info=True)
            return Response({
                'success': False,
                'error': 'An unexpected error occurred while fetching mentor details'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class StandardResultsSetPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100


class CreateOrderAPIView(APIView):
    """API view to create Razorpay order (Step 1)"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        serializer = CreateOrderSerializer(data=request.data)
        if serializer.is_valid():
            validated_data = serializer.validated_data
            
            # Get the mentor object, not just the ID
            mentor_id = validated_data['mentor_id']
            
            # Option 1: Use the stored mentor object from serializer validation
            mentor = getattr(serializer, '_mentor_obj', None)
            
            # Option 2: Fallback - fetch mentor if not available from serializer
            if not mentor:
                try:
                    mentor = Mentor.objects.get(id=mentor_id, is_approved=True, is_available=True)
                except Mentor.DoesNotExist:
                    return Response({
                        'success': False,
                        'message': 'Mentor not found or not available'
                    }, status=status.HTTP_404_NOT_FOUND)
            
            # Calculate amount using the mentor object
            duration_hours = validated_data['duration_minutes'] / 60
            base_amount = Decimal(str(mentor.hourly_rate)) * Decimal(str(duration_hours))
            platform_fee = base_amount * Decimal('0.10')
            tax_amount = base_amount * Decimal('0.18')
            total_amount = base_amount + platform_fee + tax_amount
            
            # Create Razorpay order
            client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
            
            try:
                order_data = {
                    'amount': int(total_amount * 100),  # Razorpay expects amount in paise
                    'currency': 'INR',
                    'receipt': f'session_{request.user.id}_{timezone.now().timestamp()}',
                    'notes': {
                        'mentor_id': mentor.id,  # Now using mentor object
                        'student_id': request.user.id,
                        'duration_minutes': validated_data['duration_minutes'],
                        'scheduled_date': validated_data['scheduled_date'].isoformat(),
                        'scheduled_time': validated_data['scheduled_time'].isoformat(),
                        'session_mode': validated_data['session_mode'],
                        'subjects': ','.join(map(str, validated_data.get('subjects', [])))
                    }
                }
                
                razorpay_order = client.order.create(order_data)
                
                return Response({
                    'success': True,
                    'message': 'Order created successfully',
                    'order_id': razorpay_order['id'],
                    'amount': total_amount,
                    'currency': 'INR',
                    'razorpay_key': settings.RAZORPAY_KEY_ID,
                    'session_details': {
                        'mentor_name': mentor.user.name,  # Now using mentor object
                        'scheduled_date': validated_data['scheduled_date'],
                        'scheduled_time': validated_data['scheduled_time'],
                        'duration_minutes': validated_data['duration_minutes'],
                        'session_mode': validated_data['session_mode'],
                    }
                }, status=status.HTTP_200_OK)
                
            except Exception as e:
                return Response({
                    'success': False,
                    'message': 'Failed to create payment order',
                    'error': str(e)
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        return Response({
            'success': False,
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)

class ConfirmBookingAPIView(APIView):
    """API view to confirm booking after successful payment (Step 2)"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        serializer = ConfirmBookingSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            try:
                session = serializer.save()
                # Get the payment object
                try:
                    if hasattr(session, '_payment'):
                        payment = session._payment
                    else:
                        payment = SessionPayment.objects.get(session=session)
                    session_serializer = MentorSessionSerializer(session)
                    payment_serializer = SessionPaymentSerializer(payment)
                    # Send real-time notification to mentor
                    notify_mentor(session.mentor.user.id, {
                        "event": "session_booked",
                        "session_id": session.id,
                        "student_name": session.student.name,
                        "scheduled_date": str(session.scheduled_date),
                        "scheduled_time": str(session.scheduled_time)
                    })
                    print(f"[ConfirmBookingAPIView] Notifying mentor {session.mentor.user.id} for session {session.id}")
                    return Response({
                        'success': True,
                        'message': 'Session booked successfully',
                        'session': session_serializer.data,
                        'payment': payment_serializer.data
                    }, status=status.HTTP_201_CREATED)
                except SessionPayment.DoesNotExist:
                    session_serializer = MentorSessionSerializer(session)
                    print("Warning: Payment object not found for session")
                    notify_mentor(session.mentor.user.id, {
                        "event": "session_booked",
                        "session_id": session.id,
                        "student_name": session.student.name,
                        "scheduled_date": str(session.scheduled_date),
                        "scheduled_time": str(session.scheduled_time)
                    })
                    return Response({
                        'success': True,
                        'message': 'Session booked successfully',
                        'session': session_serializer.data,
                        'payment': None
                    }, status=status.HTTP_201_CREATED)
            except Exception as e:
                print(f"Error in confirm booking: {str(e)}")
                import traceback
                traceback.print_exc()
                return Response({
                    'success': False,
                    'message': 'Failed to create session',
                    'error': str(e)
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        return Response({
            'success': False,
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)



class UserSessionsListAPIView(APIView):
    """API view to list user's sessions """
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination
    
    def get_queryset(self, request):
        user = request.user
        user_type = request.query_params.get('type', 'all')  # 'student', 'mentor', 'all'
        
        if user_type == 'student':
            queryset = MentorSession.objects.filter(student=user)
        elif user_type == 'mentor' and hasattr(user, 'mentor_profile'):
            queryset = MentorSession.objects.filter(mentor=user.mentor_profile)
        else:
            # Return both student and mentor sessions
            queryset = MentorSession.objects.filter(
                Q(student=user) | 
                Q(mentor__user=user)
            )
        
        # Filter by status if provided
        session_status = request.query_params.get('status')
        if session_status:
            queryset = queryset.filter(status=session_status)
        
        # Filter by upcoming/past
        time_filter = request.query_params.get('time_filter')
        if time_filter == 'upcoming':
            current_datetime = timezone.now()
            queryset = queryset.filter(
                scheduled_date__gte=current_datetime.date()
            ).filter(
                Q(scheduled_date__gt=current_datetime.date()) |
                Q(scheduled_date=current_datetime.date(), scheduled_time__gt=current_datetime.time())
            )
        elif time_filter == 'past':
            current_datetime = timezone.now()
            queryset = queryset.filter(
                Q(scheduled_date__lt=current_datetime.date()) |
                Q(scheduled_date=current_datetime.date(), scheduled_time__lt=current_datetime.time())
            )
        
        return queryset.order_by('-scheduled_date', '-scheduled_time')
    
    def get(self, request):
        queryset = self.get_queryset(request)
        
        # Paginate results
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(queryset, request)
        
        if page is not None:
            serializer = MentorSessionSerializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)
        
        serializer = MentorSessionSerializer(queryset, many=True)
        return Response({
            'success': True,
            'data': serializer.data
        })


class SessionDetailAPIView(APIView):
    """API view to retrieve and update session details"""
    permission_classes = [IsAuthenticated]
    
    def get_object(self, request, pk):
        user = request.user
        queryset = MentorSession.objects.filter(
            Q(student=user) | Q(mentor__user=user)
        )
        return get_object_or_404(queryset, id=pk)
    
    def get(self, request, pk):
        session = self.get_object(request, pk)
        serializer = MentorSessionSerializer(session)
        return Response({
            'success': True,
            'data': serializer.data
        })
    
    def put(self, request, pk):
        session = self.get_object(request, pk)
        serializer = MentorSessionSerializer(session, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({
                'success': True,
                'message': 'Session updated successfully',
                'data': serializer.data
            })
        return Response({
            'success': False,
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
    
    def patch(self, request, pk):
        session = self.get_object(request, pk)
        serializer = MentorSessionSerializer(session, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({
                'success': True,
                'message': 'Session updated successfully',
                'data': serializer.data
            })
        return Response({
            'success': False,
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)


class CancelSessionAPIView(APIView):
    """API view to cancel a session"""
    permission_classes = [IsAuthenticated]
    
    def patch(self, request, pk):
        user = request.user
        session = get_object_or_404(
            MentorSession.objects.filter(
                Q(student=user) | Q(mentor__user=user)
            ),
            id=pk
        )
        
        if session.status not in ['pending', 'confirmed']:
            return Response({
                'success': False,
                'error': 'Cannot cancel session in current status'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if cancellation is allowed (at least 24 hours before session)
        session_datetime = timezone.datetime.combine(session.scheduled_date, session.scheduled_time)
        now = timezone.now()
        if timezone.is_naive(session_datetime):
            session_datetime = timezone.make_aware(session_datetime, now.tzinfo)
        if session_datetime <= now + timezone.timedelta(hours=24):
            return Response({
                'success': False,
                'error': 'Cannot cancel session less than 24 hours before scheduled time'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        serializer = CancelSessionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        reason = serializer.validated_data.get('reason', '')
        session.cancel_session(user, reason)
        
        # Handle refund if payment was made
        if hasattr(session, 'payment') and session.payment.status == 'completed':
            payment = session.payment
            refund_amount = payment.amount * Decimal('0.90')  # 90% refund
            platform_fee = payment.amount * Decimal('0.10')   # 10% platform fee

            # Refund to user (student)
            session.student.wallet_balance += refund_amount
            session.student.save()
            WalletTransaction.objects.create(
                user=session.student,
                amount=refund_amount,
                transaction_type='credit',
                description=f'Refund for cancelled session {session.id}'
            )

            # Deduct from mentor (if already credited)
            if hasattr(session.mentor, 'wallet_balance'):
                mentor_user = session.mentor.user
                session.mentor.wallet_balance -= refund_amount
                session.mentor.save()
                WalletTransaction.objects.create(
                    user=mentor_user,
                    amount=refund_amount,
                    transaction_type='debit',
                    description=f'Refund for cancelled session {session.id}'
                )
        
        # Send real-time notification to mentor
        notify_mentor(session.mentor.user.id, {
            "event": "session_cancelled",
            "session_id": session.id,
            "student_name": session.student.name,
            "scheduled_date": str(session.scheduled_date),
            "scheduled_time": str(session.scheduled_time),
            "reason": reason
        })
        print(f"[CancelSessionAPIView] Notifying mentor {session.mentor.user.id} for session {session.id}")
        
        session_serializer = MentorSessionSerializer(session)
        return Response({
            'success': True,
            'message': 'Session cancelled successfully',
            'data': session_serializer.data
        })


class SessionPaymentAPIView(APIView):
    """API view to handle session payments"""
    permission_classes = [IsAuthenticated]
    
    def get_object(self, request, session_id):
        session = get_object_or_404(
            MentorSession.objects.filter(student=request.user),
            id=session_id
        )
        return get_object_or_404(SessionPayment, session=session)
    
    def get(self, request, session_id):
        payment = self.get_object(request, session_id)
        serializer = SessionPaymentSerializer(payment)
        return Response({
            'success': True,
            'data': serializer.data
        })
    
    def patch(self, request, session_id):
        """Update payment status (used for payment gateway callbacks)"""
        payment = self.get_object(request, session_id)
        
        # Update payment details from gateway response
        gateway_payment_id = request.data.get('gateway_payment_id')
        gateway_signature = request.data.get('gateway_signature')
        payment_status = request.data.get('status', 'completed')
        
        if gateway_payment_id:
            payment.gateway_payment_id = gateway_payment_id
        if gateway_signature:
            payment.gateway_signature = gateway_signature
        
        payment.gateway_response = request.data
        
        if payment_status == 'completed':
            payment.mark_as_paid()
        else:
            payment.status = payment_status
            payment.save()
        
        serializer = SessionPaymentSerializer(payment)
        return Response({
            'success': True,
            'message': 'Payment updated successfully',
            'data': serializer.data
        })


class CreateSessionReviewAPIView(APIView):
    """API view to create or update session review"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request, session_id):
        # Get the session - ensure it's completed and belongs to the user
        session = get_object_or_404(
            MentorSession.objects.filter(
                student=request.user,  # Only students can leave reviews
                # status='completed' for later addition
            ),
            id=session_id
        )
        
        # Check if review already exists
        existing_review = SessionReview.objects.filter(
            session=session,
            reviewer=request.user
        ).first()
        
        if existing_review:
            # Update existing review
            serializer = SessionReviewSerializer(existing_review, data=request.data, partial=True)
        else:
            # Create new review
            serializer = SessionReviewSerializer(data=request.data)
        
        if serializer.is_valid():
            review = serializer.save(reviewer=request.user, session=session)
            
            # Update mentor's average rating
            self.update_mentor_rating(session.mentor)
            
            return Response({
                'success': True,
                'message': 'Review submitted successfully',
                'data': serializer.data
            }, status=status.HTTP_201_CREATED)
        
        return Response({
            'success': False,
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
    
    def update_mentor_rating(self, mentor):
        """Update mentor's average rating based on all reviews"""
        from django.db.models import Avg
        
        # Get all reviews for this mentor's sessions
        reviews = SessionReview.objects.filter(
            session__mentor=mentor,
            is_public=True
        )
        
        if reviews.exists():
            avg_rating = reviews.aggregate(Avg('rating'))['rating__avg']
            mentor.rating = round(avg_rating, 2)
            mentor.save()


class SessionReviewsListAPIView(APIView):
    """API view to list session reviews"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request, session_id):
        session = get_object_or_404(
            MentorSession.objects.filter(
                Q(student=request.user) | Q(mentor__user=request.user)
            ),
            id=session_id
        )
        
        reviews = SessionReview.objects.filter(session=session)
        serializer = SessionReviewSerializer(reviews, many=True)
        
        return Response({
            'success': True,
            'data': serializer.data
        })

class SessionMessagesAPIView(APIView):
    """API view to list and create session messages"""
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination
    
    def get_session(self, request, session_id):
        return get_object_or_404(
            MentorSession.objects.filter(
                Q(student=request.user) | Q(mentor__user=request.user)
            ),
            id=session_id
        )
    
    def get(self, request, session_id):
        session = self.get_session(request, session_id)
        messages = SessionMessage.objects.filter(session=session).order_by('created_at')
        
        # Paginate results
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(messages, request)
        
        if page is not None:
            serializer = SessionMessageSerializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)
        
        serializer = SessionMessageSerializer(messages, many=True)
        return Response({
            'success': True,
            'data': serializer.data
        })
    
    def post(self, request, session_id):
        session = self.get_session(request, session_id)
        
        serializer = SessionMessageSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(sender=request.user, session=session)
            return Response({
                'success': True,
                'message': 'Message sent successfully',
                'data': serializer.data
            }, status=status.HTTP_201_CREATED)
        
        return Response({
            'success': False,
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)


class SessionStatsAPIView(APIView):
    """API endpoint to get session statistics for the user"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user = request.user
        
        # Student stats
        student_sessions = MentorSession.objects.filter(student=user)
        student_stats = {
            'total_sessions': student_sessions.count(),
            'completed_sessions': student_sessions.filter(status='completed').count(),
            'upcoming_sessions': student_sessions.filter(
                scheduled_date__gte=timezone.now().date(),
                status__in=['pending', 'confirmed']
            ).count(),
            'cancelled_sessions': student_sessions.filter(status='cancelled').count(),
        }
        
        # Mentor stats (if user is a mentor)
        mentor_stats = {}
        if hasattr(user, 'mentor_profile'):
            mentor_sessions = MentorSession.objects.filter(mentor=user.mentor_profile)
            mentor_stats = {
                'total_sessions': mentor_sessions.count(),
                'completed_sessions': mentor_sessions.filter(status='completed').count(),
                'upcoming_sessions': mentor_sessions.filter(
                    scheduled_date__gte=timezone.now().date(),
                    status__in=['pending', 'confirmed']
                ).count(),
                'total_earnings': sum(
                    earning.mentor_earning for earning in 
                    MentorEarnings.objects.filter(mentor=user.mentor_profile)
                ),
            }
        
        return Response({
            'success': True,
            'data': {
                'student_stats': student_stats,
                'mentor_stats': mentor_stats,
                'is_mentor': hasattr(user, 'mentor_profile')
            }
        })



class FocusBuddySessionListView(APIView):
    """
    GET: List all active sessions that users can view and join
    POST: Create a new focus buddy session
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get list of active sessions"""
        # Filter only active sessions that haven't expired
        sessions = FocusBuddySession.objects.filter(
            status='active'
        ).annotate(
    annotated_participant_count=Count('participants', filter=Q(participants__left_at__isnull=True))
).order_by('-created_at')
        
        # Remove expired sessions (cleanup)
        expired_sessions = []
        for session in sessions:
            if session.is_expired and session.status == 'active':
                session.end_session('expired')
                expired_sessions.append(session.id)
        
        # Filter out expired sessions from queryset
        if expired_sessions:
            sessions = sessions.exclude(id__in=expired_sessions)
        
        serializer = FocusBuddySessionListSerializer(sessions, many=True)
        return Response({
            'sessions': serializer.data,
            'total_active_sessions': sessions.count()
        })
    
    def post(self, request):
        """Create a new focus buddy session"""
        serializer = FocusBuddySessionCreateSerializer(
            data=request.data, 
            context={'request': request}
        )
        if serializer.is_valid():
            session = serializer.save()

            print("Adding creator as a participant")
            FocusBuddyParticipant.objects.create(
                session=session,
                user=request.user,
                camera_enabled=True,        
                microphone_enabled=True      
            )
            print("Creator added as participant successfully")

            #  Create a welcome system message
            FocusBuddyMessage.objects.create(
                session=session,
                sender=request.user,
                message=f"Welcome to the {session.duration_minutes}-minute focus session!",
                is_system_message=True
            )

            # Return full session info
            detail_serializer = FocusBuddySessionDetailSerializer(session)
            return Response(detail_serializer.data, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class FocusBuddySessionDetailView(APIView):
    """
    GET: Get detailed information about a specific session
    DELETE: End/cancel a session (only creator can do this)
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, session_id):
        """Get detailed session information"""
        session = get_object_or_404(
            FocusBuddySession.objects.prefetch_related('participants__user'),
            id=session_id
        )
        # Check if session expired and update status
        if session.is_expired and session.status == 'active':
            session.end_session('expired')
        serializer = FocusBuddySessionDetailSerializer(session, context={'request': request})
        print("[DEBUG] Serializer output:", serializer.data)
        return Response(serializer.data)
    
    def delete(self, request, session_id):
        """End or cancel a session (only creator)"""
        session = get_object_or_404(FocusBuddySession, id=session_id)
        
        # Only creator can end the session
        if session.creator_id != request.user:
            return Response(
                {'error': 'Only the session creator can end the session'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        if session.status != 'active':
            return Response(
                {'error': 'Session is not active'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # End the session
        reason = 'cancelled' if not session.is_expired else 'completed'
        session.end_session(reason)
        
        # Create system message about session ending
        FocusBuddyMessage.objects.create(
            session=session,
            sender=request.user,
            message="Session ended by creator",
            is_system_message=True
        )
        
        return Response({'message': f'Session {reason} successfully'})




class JoinSessionView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request, session_id):
        print(f"DEBUG: Join request - User: {request.user.id}, Session: {session_id}")
        print(f"DEBUG: Request data: {request.data}")
        
        try:
            session = get_object_or_404(FocusBuddySession, id=session_id)
            print(f"DEBUG: Session found - Status: {session.status}, Creator: {session.creator_id.id}")
            
            # Check if user is the creator
            if session.creator_id == request.user:
                print("DEBUG: User is the session creator")
                return Response(
                    {'error': 'Session creators do not need to join - you are automatically the host'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Check if already in session (race-condition safe)
            participant, created = FocusBuddyParticipant.objects.get_or_create(
                session=session,
                user=request.user,
                defaults={
                    'camera_enabled': request.data.get('camera_enabled', True),
                    'microphone_enabled': request.data.get('microphone_enabled', True),
                    'status': 'pending',  # New join requests are pending
                }
            )

            if not created:
                if participant.left_at is None:
                    if participant.status == 'pending':
                        return Response(
                            {'message': 'Join request is still pending approval', 'pending': True},
                            status=status.HTTP_202_ACCEPTED
                        )
                    elif participant.status == 'rejected':
                        return Response(
                            {'error': 'Your join request was rejected by the host', 'rejected': True},
                            status=status.HTTP_403_FORBIDDEN
                        )
                    else:
                        print(f"DEBUG: User already in session as participant {participant.id}")
                        return Response(
                            {'error': 'You are already in this session'}, 
                            status=status.HTTP_400_BAD_REQUEST
                        )
                else:
                    print(f"DEBUG: Rejoining session - updating left_at = None for {participant.id}")
                    participant.left_at = None
                    participant.camera_enabled = request.data.get('camera_enabled', True)
                    participant.microphone_enabled = request.data.get('microphone_enabled', True)
                    participant.status = 'pending'  # Rejoining requires approval again
                    participant.save()
                    return Response(
                        {'message': 'Join request is now pending approval', 'pending': True},
                        status=status.HTTP_202_ACCEPTED
                    )
            
            # Check session status
            if session.status not in ['waiting', 'active']:
                print(f"DEBUG: Session not joinable - status: {session.status}")
                return Response(
                    {'error': f'Cannot join session in {session.status} status'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Check capacity *after* confirming not already in
            current_participants = FocusBuddyParticipant.objects.filter(
                session=session, 
                left_at__isnull=True,
                status='approved'
            ).count()
            print(f"DEBUG: Current participants: {current_participants}/{session.max_participants}")
            
            if current_participants >= session.max_participants:
                # Undo if newly created
                if created:
                    print(f"DEBUG: Rolling back participant creation due to full session")
                    participant.delete()
                return Response(
                    {'error': 'Session is full'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Send real-time notification to host about new join request
            if created or (not created and participant.status == 'pending'):
                try:
                    channel_layer = get_channel_layer()
                    async_to_sync(channel_layer.group_send)(
                        f'webrtc_session_{session_id}',
                        {
                            'type': 'notify_host_new_request',
                            'participant_id': participant.id,
                            'user_name': request.user.name,
                            'user_id': request.user.id
                        }
                    )
                    print(f"DEBUG: Sent real-time notification to host for participant {participant.id}")
                except Exception as e:
                    print(f"DEBUG: Failed to send real-time notification: {e}")

            # Return pending status to user
            return Response(
                {'message': 'Join request sent. Waiting for host approval.', 'pending': True},
                status=status.HTTP_202_ACCEPTED
            )

        except Exception as e:
            print(f"DEBUG: Exception in join session: {str(e)}")
            print(f"DEBUG: Exception type: {type(e)}")
            import traceback
            print(f"DEBUG: Traceback: {traceback.format_exc()}")
            return Response(
                {'error': 'Internal server error'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )



class LeaveSessionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, session_id):
        session = get_object_or_404(FocusBuddySession, id=session_id)
        user = request.user

        # ✅ If creator leaves → end session directly
        if session.creator_id == user.id:
            print("DEBUG: Creator is leaving — ending session.")

            try:
                participant = FocusBuddyParticipant.objects.get(
                    session=session,
                    user=user,
                    left_at__isnull=True
                )
            except FocusBuddyParticipant.DoesNotExist:
                return Response(
                    {"error": "Creator is not in the participant list"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            with transaction.atomic():
                # Mark creator as left
                participant.leave_session()

                # End session regardless of other participants
                session.end_session('completed')

                FocusBuddyMessage.objects.create(
                    session=session,
                    sender=user,
                    message=f"{user.name} (creator) ended the session by leaving",
                    is_system_message=True
                )

            return Response(
                {"message": "Session ended because the creator left"},
                status=200
            )

        #  Normal participant leaves
        try:
            participant = FocusBuddyParticipant.objects.get(
                session=session,
                user=user,
                left_at__isnull=True
            )
        except FocusBuddyParticipant.DoesNotExist:
            return Response(
                {"error": "You are not currently in this session"},
                status=status.HTTP_400_BAD_REQUEST
            )

        with transaction.atomic():
            participant.leave_session()

            FocusBuddyMessage.objects.create(
                session=session,
                sender=user,
                message=f"{user.name} left the session",
                is_system_message=True
            )

        return Response(
            {"message": "Successfully left session"},
            status=200
        )

class UpdateParticipantView(APIView):
    """
    PATCH: Update participant settings (camera/microphone)
    """
    permission_classes = [IsAuthenticated]
    
    def patch(self, request, session_id):
        """Update participant camera/microphone settings"""
        session = get_object_or_404(FocusBuddySession, id=session_id)
        
        try:
            participant = FocusBuddyParticipant.objects.get(
                session=session, 
                user=request.user, 
                left_at__isnull=True
            )
        except FocusBuddyParticipant.DoesNotExist:
            return Response(
                {'error': 'You are not currently in this session'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = UpdateParticipantSerializer(
            participant, 
            data=request.data, 
            partial=True
        )
        
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class SessionMessagesView(APIView):
    """
    GET: Get chat messages for a session
    POST: Send a chat message to a session
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, session_id):
        """Get chat messages for a session"""
        session = get_object_or_404(FocusBuddySession, id=session_id)
        
        # Check if user is participant in session
        if not session.participants.filter(user=request.user, left_at__isnull=True).exists():
            return Response(
                {'error': 'You must be a participant to view messages'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        messages = session.messages.all().order_by('-created_at')[:50]  # Last 50 messages
        serializer = FocusBuddyMessageSerializer(messages, many=True)
        
        return Response({
            'messages': serializer.data[::-1],  # Reverse to show oldest first
            'total_messages': session.messages.count()
        })
    
    def post(self, request, session_id):
        """Send a chat message to a session"""
        session = get_object_or_404(FocusBuddySession, id=session_id)
        
        # Check if user is participant in session
        if not session.participants.filter(user=request.user, left_at__isnull=True).exists():
            return Response(
                {'error': 'You must be a participant to send messages'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check if session is still active
        if session.status != 'active' or session.is_expired:
            return Response(
                {'error': 'Cannot send messages to inactive sessions'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = FocusBuddyMessageSerializer(
            data=request.data, 
            context={'request': request, 'session': session}
        )
        
        if serializer.is_valid():
            message = serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class SessionFeedbackView(APIView):
    """
    POST: Submit feedback for a completed session
    GET: Get feedback for a session (session creator only)
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request, session_id):
        """Submit feedback for a session"""
        session = get_object_or_404(FocusBuddySession, id=session_id)
        
        # Check if user participated in the session
        try:
            participant = FocusBuddyParticipant.objects.get(
                session=session, 
                user=request.user
            )
        except FocusBuddyParticipant.DoesNotExist:
            return Response(
                {'error': 'You must have participated in this session to give feedback'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check if session is completed
        if session.status not in ['completed', 'expired']:
            return Response(
                {'error': 'Can only give feedback for completed sessions'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if feedback already exists
        if FocusBuddyFeedback.objects.filter(session=session, participant=participant).exists():
            return Response(
                {'error': 'You have already submitted feedback for this session'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = FocusBuddyFeedbackSerializer(
            data=request.data, 
            context={'participant': participant}
        )
        
        if serializer.is_valid():
            feedback = serializer.save()
            
            # Update user stats if needed
            if hasattr(request.user, 'focus_stats'):
                request.user.focus_stats.update_stats_after_session(
                    participant, 
                    feedback.session_rating
                )
            
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def get(self, request, session_id):
        """Get feedback for a session (creator only)"""
        session = get_object_or_404(FocusBuddySession, id=session_id)
        
        # Only session creator can view feedback
        if session.creator_id != request.user:
            return Response(
                {'error': 'Only session creator can view feedback'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        feedback = session.feedback.all()
        serializer = FocusBuddyFeedbackSerializer(feedback, many=True)
        
        return Response({
            'feedback': serializer.data,
            'total_feedback': feedback.count(),
            'average_rating': feedback.aggregate(
                avg_rating=models.Avg('session_rating')
            )['avg_rating'] or 0
        })


class SessionStatsView(APIView):
    """
    GET: Get general statistics about focus buddy sessions
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get general session statistics"""
        # Active sessions count
        active_sessions = FocusBuddySession.objects.filter(status='active')
        
        # Clean up expired sessions
        for session in active_sessions:
            if session.is_expired:
                session.end_session('expired')
        
        # Refresh active sessions after cleanup
        active_sessions = FocusBuddySession.objects.filter(status='active')
        
        # Total participants currently online
        total_participants = FocusBuddyParticipant.objects.filter(
            session__status='active',
            left_at__isnull=True
        ).count()
        
        # Sessions by duration
        sessions_by_duration = dict(
            active_sessions.values('duration_minutes').annotate(
                count=Count('id')
            ).values_list('duration_minutes', 'count')
        )
        
        # Sessions by type
        sessions_by_type = dict(
            active_sessions.values('session_type').annotate(
                count=Count('id')
            ).values_list('session_type', 'count')
        )
        
        stats_data = {
            'total_active_sessions': active_sessions.count(),
            'total_participants_online': total_participants,
            'sessions_by_duration': sessions_by_duration,
            'sessions_by_type': sessions_by_type
        }
        
        serializer = SessionStatsSerializer(stats_data)
        return Response(serializer.data)

class WebRTCConfigView(APIView):
    """
    API view to provide WebRTC configuration including ICE servers
    """
    permission_classes = [IsAuthenticated]
    authentication_classes = [CombinedCookieJWTAuthentication]
    
    def get_ice_servers(self):
        """Get ICE servers configuration with free services"""
        # Default STUN servers (public and free)
        default_stun_servers = [
            'stun:stun.l.google.com:19302',
            'stun:stun1.l.google.com:19302',
            'stun:stun2.l.google.com:19302',
        ]
        
        # FREE TURN/STUN servers - No signup required!
        free_turn_servers = [
            # Open Relay Project - Free TURN servers
            {
                'urls': 'turn:openrelay.metered.ca:80',
                'username': 'openrelayproject',
                'credential': 'openrelayproject'
            },
            {
                'urls': 'turn:openrelay.metered.ca:443',
                'username': 'openrelayproject',
                'credential': 'openrelayproject'
            },
            {
                'urls': 'turn:openrelay.metered.ca:443?transport=tcp',
                'username': 'openrelayproject',
                'credential': 'openrelayproject'
            },
            
            # Additional free TURN servers
            {
                'urls': 'turn:relay.backups.cz',
                'username': 'webrtc',
                'credential': 'webrtc'
            },
            {
                'urls': 'turn:relay.backups.cz?transport=tcp',
                'username': 'webrtc',
                'credential': 'webrtc'
            }
        ]
        
        ice_servers = []
        
        # Add free STUN servers (always include these)
        for stun_url in default_stun_servers:
            ice_servers.append({'urls': stun_url})
        
        # Add free TURN servers
        ice_servers.extend(free_turn_servers)
        
        # Check if custom ICE servers are configured in settings
        if hasattr(settings, 'WEBRTC_CONFIG') and 'ICE_SERVERS' in settings.WEBRTC_CONFIG:
            ice_servers.extend(settings.WEBRTC_CONFIG['ICE_SERVERS'])
        
        return ice_servers
    
    def get(self, request):
        """Get WebRTC configuration including ICE servers"""
        config = {
            'iceServers': self.get_ice_servers(),
            'iceTransportPolicy': 'all',  # Use both STUN and TURN
            'iceCandidatePoolSize': 10,  
        }
        
        # Add additional config from settings if available
        if hasattr(settings, 'WEBRTC_CONFIG'):
            webrtc_settings = settings.WEBRTC_CONFIG
            config.update({
                'maxParticipants': webrtc_settings.get('MAX_PARTICIPANTS', 8),
                'sessionDurations': webrtc_settings.get('SESSION_DURATIONS', [15, 25, 50]),
                'enableChat': webrtc_settings.get('ENABLE_CHAT', True),
            })
        
        return Response(config, status=status.HTTP_200_OK)

class JoinMentorSessionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, session_id):
        user = request.user

        try:
            session = MentorSession.objects.get(id=session_id, student=user)
        except MentorSession.DoesNotExist:
            return Response({"error": "Session not found or you're not authorized"}, status=404)

        if session.status not in ['confirmed', 'ongoing']:
            return Response({"error": f"Cannot join session in '{session.status}' state"}, status=400)

        # Automatically switch to ongoing if confirmed and time has arrived
        if session.status == 'confirmed' and session.session_datetime <= timezone.now():
            session.status = 'ongoing'
            session.started_at = timezone.now()
            session.save()

        serializer = MentorSessionSerializer(session)
        return Response(serializer.data)

class LeaveMentorSessionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, session_id):
        user = request.user

        try:
            session = MentorSession.objects.get(id=session_id, student=user)
        except MentorSession.DoesNotExist:
            return Response({"error": "Session not found or unauthorized"}, status=404)

        if session.status != 'ongoing':
            return Response({"error": "You cannot leave a session that is not ongoing"}, status=400)

        # Mark end time and complete
        session.ended_at = timezone.now()
        session.status = 'completed'
        session.save()

        return Response({"message": "You have left the session. Marked as completed."})


class UserSettingsAPIView(APIView):
    """API view to get and update user settings"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get user settings and profile information"""
        user = request.user
        serializer = UserSettingsSerializer(user)
        
        return Response({
            'success': True,
            'data': serializer.data
        })
    
    def patch(self, request):
        """Update user settings"""
        user = request.user
        serializer = UserSettingsSerializer(user, data=request.data, partial=True)
        
        if serializer.is_valid():
            serializer.save()
            return Response({
                'success': True,
                'message': 'Profile updated successfully',
                'data': serializer.data
            })
        
        return Response({
            'success': False,
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)


class PasswordChangeAPIView(APIView):
    """API view to change user password"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Change user password"""
        serializer = PasswordChangeSerializer(
            data=request.data,
            context={'request': request}
        )
        
        if serializer.is_valid():
            user = request.user
            new_password = serializer.validated_data['new_password']
            
            # Set new password
            user.set_password(new_password)
            user.save()
            
            # Keep user logged in after password change
            update_session_auth_hash(request, user)
            
            return Response({
                'success': True,
                'message': 'Password changed successfully'
            })
        
        return Response({
            'success': False,
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)


class UserStatsAPIView(APIView):
    """API view to get user statistics"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get user activity statistics"""
        user = request.user
        
        # Get pomodoro sessions count
        pomodoro_count = PomodoroSession.objects.filter(
            task__user=user,
            session_type='focus',
            is_completed=True
        ).count()
        
        # Get focus buddy sessions count
        focus_buddy_count = FocusBuddySession.objects.filter(
            Q(creator_id=user) | Q(participants__user=user)
        ).distinct().count()
        
        # Get journals count
        journals_count = Journal.objects.filter(user=user).count()
        
        # Get tasks count
        total_tasks = Task.objects.filter(user=user).count()
        completed_tasks = Task.objects.filter(user=user, is_completed=True).count()
        
        # Calculate daily streak
        daily_streak = self.calculate_daily_streak(user)
        
        # Get mentor sessions if user is a mentor
        mentor_sessions = 0
        if hasattr(user, 'mentor_profile'):
            mentor_sessions = MentorSession.objects.filter(mentor=user.mentor_profile).count()
        
        stats_data = {
            'pomodoro_sessions': pomodoro_count,
            'focus_buddy_sessions': focus_buddy_count,
            'journals_created': journals_count,
            'daily_streak': daily_streak,
            'total_tasks': total_tasks,
            'completed_tasks': completed_tasks,
            'mentor_sessions': mentor_sessions
        }
        
        serializer = UserStatsSerializer(stats_data)
        
        return Response({
            'success': True,
            'data': serializer.data
        })
    
    def calculate_daily_streak(self, user):
        """Calculate user's daily streak based on activity"""
        today = timezone.now().date()
        current_date = today
        streak = 0
        
        # Check each day going backwards
        for i in range(365):  # Check up to 365 days
            # Check if user had any activity on this date
            has_activity = (
                # Pomodoro sessions
                PomodoroSession.objects.filter(
                    task__user=user,
                    start_time__date=current_date,
                    is_completed=True
                ).exists() or
                # Journal entries
                Journal.objects.filter(
                    user=user,
                    date=current_date
                ).exists() or
                # Focus buddy sessions
                FocusBuddySession.objects.filter(
                    creator_id=user,
                    started_at__date=current_date
                ).exists()
            )
            
            if has_activity:
                streak += 1
                current_date -= timedelta(days=1)
            else:
                # If it's today and no activity, streak is 0
                # If it's not today, break the streak
                if current_date == today:
                    streak = 0
                break
        
        return streak


class DeleteAccountAPIView(APIView):
    """API view to delete user account"""
    permission_classes = [IsAuthenticated]
    
    def delete(self, request):
        """Delete user account"""
        user = request.user
                
        # Delete the user account
        user.delete()
        
        return Response({
            'success': True,
            'message': 'Account deleted successfully'
        })

class FocusBuddyPagination(PageNumberPagination):
    """Custom pagination for focus buddy sessions"""
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class FocusBuddyHistoryListView(APIView):
    """
    API view to retrieve focus buddy session history for the authenticated user.
    Shows sessions the user created or participated in.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user = request.user
        
        # Get sessions where user was creator or participant
        queryset = FocusBuddySession.objects.filter(
            Q(creator_id=user) |  # Sessions created by user
            Q(participants__user=user)  # Sessions user participated in
        ).distinct().select_related('creator_id').prefetch_related('participants')
        
        # Optional filtering by status
        status_param = request.query_params.get('status', None)
        if status_param:
            queryset = queryset.filter(status=status_param)
        
        # Optional filtering by session type
        session_type = request.query_params.get('session_type', None)
        if session_type:
            queryset = queryset.filter(session_type=session_type)
        
        # Optional date range filtering
        start_date = request.query_params.get('start_date', None)
        end_date = request.query_params.get('end_date', None)
        if start_date:
            queryset = queryset.filter(created_at__gte=start_date)
        if end_date:
            queryset = queryset.filter(created_at__lte=end_date)
        
        queryset = queryset.order_by('-created_at')
        
        # Apply pagination
        paginator = FocusBuddyPagination()
        page = paginator.paginate_queryset(queryset, request)
        
        if page is not None:
            serializer = FocusBuddySessionHistorySerializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)
        
        serializer = FocusBuddySessionHistorySerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class UserCreatedSessionsView(APIView):
    """
    API view to retrieve sessions created by the authenticated user only.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user = request.user
        
        queryset = FocusBuddySession.objects.filter(
            creator_id=user
        ).select_related('creator_id').prefetch_related('participants').order_by('-created_at')
        
        # Optional filtering by status
        status_param = request.query_params.get('status', None)
        if status_param:
            queryset = queryset.filter(status=status_param)
        
        # Optional filtering by session type
        session_type = request.query_params.get('session_type', None)
        if session_type:
            queryset = queryset.filter(session_type=session_type)
        
        # Apply pagination
        paginator = FocusBuddyPagination()
        page = paginator.paginate_queryset(queryset, request)
        
        if page is not None:
            serializer = FocusBuddySessionHistorySerializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)
        
        serializer = FocusBuddySessionHistorySerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class UserParticipatedSessionsView(APIView):
    """
    API view to retrieve sessions the authenticated user participated in (but didn't create).
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user = request.user
        
        queryset = FocusBuddySession.objects.filter(
            participants__user=user
        ).exclude(
            creator_id=user
        ).distinct().select_related('creator_id').prefetch_related('participants').order_by('-created_at')
        
        # Optional filtering by status
        status_param = request.query_params.get('status', None)
        if status_param:
            queryset = queryset.filter(status=status_param)
        
        # Optional filtering by session type
        session_type = request.query_params.get('session_type', None)
        if session_type:
            queryset = queryset.filter(session_type=session_type)
        
        # Apply pagination
        paginator = FocusBuddyPagination()
        page = paginator.paginate_queryset(queryset, request)
        
        if page is not None:
            serializer = FocusBuddySessionHistorySerializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)
        
        serializer = FocusBuddySessionHistorySerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class FocusBuddySessionDetailedView(APIView):
    """
    API view to retrieve details of a specific focus buddy session.
    Only allows access to sessions the user created or participated in.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, session_id):
        user = request.user
        
        try:
            session = FocusBuddySession.objects.filter(
                Q(creator_id=user) | Q(participants__user=user)
            ).distinct().select_related('creator_id').prefetch_related('participants').get(id=session_id)
        except FocusBuddySession.DoesNotExist:
            return Response(
                {"error": "Session not found or you don't have permission to view it"}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = FocusBuddySessionHistorySerializer(session)
        return Response(serializer.data, status=status.HTTP_200_OK)


class FocusBuddyStatsView(APIView):
    """
    API view to get user's focus buddy statistics
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user = request.user
        
        # Get user's session statistics
        created_sessions = FocusBuddySession.objects.filter(creator_id=user)
        participated_sessions = FocusBuddySession.objects.filter(participants__user=user).distinct()
        
        # Calculate total focus minutes
        user_participations = FocusBuddyParticipant.objects.filter(user=user)
        total_focus_minutes = sum([
            p.participation_duration_minutes for p in user_participations
        ])
        
        stats = {
            'sessions_created': created_sessions.count(),
            'sessions_participated': participated_sessions.count(),
            'sessions_completed': participated_sessions.filter(status='completed').count(),
            'total_focus_minutes': total_focus_minutes,
            'sessions_by_type': {
                'study': participated_sessions.filter(session_type='study').count(),
                'work': participated_sessions.filter(session_type='work').count(),
                'reading': participated_sessions.filter(session_type='reading').count(),
            },
            'sessions_by_status': {
                'completed': participated_sessions.filter(status='completed').count(),
                'cancelled': participated_sessions.filter(status='cancelled').count(),
                'expired': participated_sessions.filter(status='expired').count(),
            }
        }
        
        return Response(stats, status=status.HTTP_200_OK)

class PomodoroHistoryPagination(PageNumberPagination):
    """Custom pagination for pomodoro history"""
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class PomodoroHistoryListView(APIView):
    """
    API view to retrieve paginated pomodoro session history for authenticated user
    """
    permission_classes = [IsAuthenticated]
    pagination_class = PomodoroHistoryPagination

    def get_queryset(self, request):
        """
        Filter sessions by authenticated user and order by most recent first
        """
        user = request.user
        queryset = PomodoroSession.objects.filter(
            task__user=user
        ).select_related('task').order_by('-start_time')
        
        # Optional filtering by session type
        session_type = request.query_params.get('session_type', None)
        if session_type:
            queryset = queryset.filter(session_type=session_type)
        
        # Optional filtering by completion status
        is_completed = request.query_params.get('is_completed', None)
        if is_completed is not None:
            is_completed_bool = is_completed.lower() == 'true'
            queryset = queryset.filter(is_completed=is_completed_bool)
        
        # Optional filtering by task
        task_id = request.query_params.get('task_id', None)
        if task_id:
            queryset = queryset.filter(task_id=task_id)
        
        # Optional date range filtering
        start_date = request.query_params.get('start_date', None)
        end_date = request.query_params.get('end_date', None)
        
        if start_date:
            queryset = queryset.filter(start_time__date__gte=start_date)
        if end_date:
            queryset = queryset.filter(start_time__date__lte=end_date)
        
        return queryset

    def get(self, request, *args, **kwargs):
        """
        Handle GET request to retrieve paginated pomodoro session history
        """
        try:
            queryset = self.get_queryset(request)
            
            # Get statistics for the current user
            user_sessions = PomodoroSession.objects.filter(task__user=request.user)
            total_sessions = user_sessions.count()
            completed_sessions = user_sessions.filter(is_completed=True).count()
            focus_sessions = user_sessions.filter(session_type='focus').count()
            
            # Initialize paginator
            paginator = self.pagination_class()
            page = paginator.paginate_queryset(queryset, request)
            
            if page is not None:
                serializer = PomodoroSessionHistorySerializer(page, many=True)
                response = paginator.get_paginated_response(serializer.data)
                
                # Add metadata to response
                response.data['meta'] = {
                    'total_sessions': total_sessions,
                    'completed_sessions': completed_sessions,
                    'focus_sessions': focus_sessions,
                    'completion_rate': round((completed_sessions / total_sessions * 100), 2) if total_sessions > 0 else 0
                }
                
                return response
            
            # If no pagination is needed
            serializer = PomodoroSessionHistorySerializer(queryset, many=True)
            return Response({
                'results': serializer.data,
                'meta': {
                    'total_sessions': total_sessions,
                    'completed_sessions': completed_sessions,
                    'focus_sessions': focus_sessions,
                    'completion_rate': round((completed_sessions / total_sessions * 100), 2) if total_sessions > 0 else 0
                }
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {'error': f'An error occurred while fetching pomodoro history: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class PomodoroSessionDetailView(APIView):
    """
    API view to retrieve a specific pomodoro session
    """
    permission_classes = [IsAuthenticated]

    def get_object(self, pk, user):
        """
        Get pomodoro session object, ensuring user can only access their own sessions
        """
        try:
            return PomodoroSession.objects.select_related('task').get(
                pk=pk, 
                task__user=user
            )
        except PomodoroSession.DoesNotExist:
            return None

    def get(self, request, pk, *args, **kwargs):
        """
        Handle GET request to retrieve a specific pomodoro session
        """
        try:
            session = self.get_object(pk, request.user)
            
            if session is None:
                return Response(
                    {'error': 'Pomodoro session not found or you do not have permission to access it.'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
            
            serializer = PomodoroSessionHistorySerializer(session)
            return Response(serializer.data, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {'error': f'An error occurred while fetching the pomodoro session: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class PomodoroSessionUpdateView(APIView):
    """
    API view to update a specific pomodoro session (optional - for future use)
    """
    permission_classes = [IsAuthenticated]

    def get_object(self, pk, user):
        """
        Get pomodoro session object, ensuring user can only access their own sessions
        """
        try:
            return PomodoroSession.objects.select_related('task').get(
                pk=pk, 
                task__user=user
            )
        except PomodoroSession.DoesNotExist:
            return None

    def patch(self, request, pk, *args, **kwargs):
        """
        Handle PATCH request to partially update a pomodoro session
        """
        try:
            session = self.get_object(pk, request.user)
            
            if session is None:
                return Response(
                    {'error': 'Pomodoro session not found or you do not have permission to access it.'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
            
            serializer = PomodoroSessionHistorySerializer(
                session, 
                data=request.data, 
                partial=True
            )
            
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data, status=status.HTTP_200_OK)
            
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
        except Exception as e:
            return Response(
                {'error': f'An error occurred while updating the pomodoro session: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class PomodoroSessionDeleteView(APIView):
    """
    API view to delete a specific pomodoro session (optional - for future use)
    """
    permission_classes = [IsAuthenticated]

    def get_object(self, pk, user):
        """
        Get pomodoro session object, ensuring user can only access their own sessions
        """
        try:
            return PomodoroSession.objects.select_related('task').get(
                pk=pk, 
                task__user=user
            )
        except PomodoroSession.DoesNotExist:
            return None

    def delete(self, request, pk, *args, **kwargs):
        """
        Handle DELETE request to remove a pomodoro session
        """
        try:
            session = self.get_object(pk, request.user)
            
            if session is None:
                return Response(
                    {'error': 'Pomodoro session not found or you do not have permission to access it.'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
            
            session.delete()
            return Response(
                {'message': 'Pomodoro session deleted successfully.'}, 
                status=status.HTTP_204_NO_CONTENT
            )
            
        except Exception as e:
            return Response(
                {'error': f'An error occurred while deleting the pomodoro session: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class ApproveParticipantView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, session_id, participant_id):
        session = get_object_or_404(FocusBuddySession, id=session_id)
        if session.creator_id != request.user:
            return Response({'error': 'Only the session creator can approve participants.'}, status=403)
        participant = get_object_or_404(FocusBuddyParticipant, id=participant_id, session=session)
        if participant.status != 'pending':
            return Response({'error': 'Participant is not pending approval.'}, status=400)
        participant.status = 'approved'
        participant.save()
        
        # Send real-time notification to host about updated request
        try:
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                f'webrtc_session_{session_id}',
                {
                    'type': 'notify_host_request_updated',
                    'participant_id': participant.id,
                    'user_name': participant.user.name,
                    'status': 'approved'
                }
            )
            print(f"DEBUG: Sent approval notification for participant {participant.id}")
            
            # Send notification directly to the participant
            async_to_sync(channel_layer.group_send)(
                f'user_{participant.user.id}',
                {
                    'type': 'notify_participant_admission_status',
                    'status': 'approved',
                    'message': 'Your join request has been approved! You can now join the video call.',
                    'session_id': session_id
                }
            )
            print(f"DEBUG: Sent approval notification to participant {participant.user.id}")
        except Exception as e:
            print(f"DEBUG: Failed to send approval notification: {e}")
        
        serializer = ParticipantSerializer(participant)
        return Response({'message': 'Participant approved.', 'participant': serializer.data}, status=200)

class RejectParticipantView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, session_id, participant_id):
        session = get_object_or_404(FocusBuddySession, id=session_id)
        if session.creator_id != request.user:
            return Response({'error': 'Only the session creator can reject participants.'}, status=403)
        participant = get_object_or_404(FocusBuddyParticipant, id=participant_id, session=session)
        if participant.status != 'pending':
            return Response({'error': 'Participant is not pending approval.'}, status=400)
        participant.status = 'rejected'
        participant.save()
        
        # Send real-time notification to host about updated request
        try:
            channel_layer = get_channel_layer()
            async_to_sync(channel_layer.group_send)(
                f'webrtc_session_{session_id}',
                {
                    'type': 'notify_host_request_updated',
                    'participant_id': participant.id,
                    'user_name': participant.user.name,
                    'status': 'rejected'
                }
            )
            print(f"DEBUG: Sent rejection notification for participant {participant.id}")
            
            # Send notification directly to the participant
            async_to_sync(channel_layer.group_send)(
                f'user_{participant.user.id}',
                {
                    'type': 'notify_participant_admission_status',
                    'status': 'rejected',
                    'message': 'Your join request was rejected by the host.',
                    'session_id': session_id
                }
            )
            print(f"DEBUG: Sent rejection notification to participant {participant.user.id}")
        except Exception as e:
            print(f"DEBUG: Failed to send rejection notification: {e}")
        
        serializer = ParticipantSerializer(participant)
        return Response({'message': 'Participant rejected.', 'participant': serializer.data}, status=200)

# --- MentorReportAPIView ---
from rest_framework.exceptions import ValidationError
class MentorReportAPIView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = MentorReportSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            # Prevent duplicate report for same user/session/mentor
            reporter = request.user
            mentor = serializer.validated_data['mentor']
            session = serializer.validated_data['session']
            if MentorReport.objects.filter(reporter=reporter, mentor=mentor, session=session).exists():
                return Response({'error': 'You have already reported this mentor for this session.'}, status=400)
            serializer.save()
            return Response({'success': True, 'message': 'Report submitted successfully.'}, status=201)
        return Response({'success': False, 'errors': serializer.errors}, status=400)