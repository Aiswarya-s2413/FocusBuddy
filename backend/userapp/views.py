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

logger = logging.getLogger(__name__)

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
                "access", data["access"], httponly=True, 
                secure=False, samesite='Lax', path="/"
            )
            response.set_cookie(
                "refresh", data["refresh"], httponly=True, 
                secure=False, samesite='Lax', path="/"
            )
            return response
        logger.warning("Login failed with errors: %s", serializer.errors)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class ForgotPasswordView(APIView):
    permission_classes = [AllowAny]
    authentication_classes=[]
    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({"message": "OTP has been sent to your email"}, status=status.HTTP_200_OK)
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
