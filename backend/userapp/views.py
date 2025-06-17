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
                    # Try to get payment from the stored reference first
                    if hasattr(session, '_payment'):
                        payment = session._payment
                    else:
                        # Fallback: query the payment
                        payment = SessionPayment.objects.get(session=session)
                    
                    # Return the created session with payment details
                    session_serializer = MentorSessionSerializer(session)
                    payment_serializer = SessionPaymentSerializer(payment)
                    
                    return Response({
                        'success': True,
                        'message': 'Session booked successfully',
                        'session': session_serializer.data,
                        'payment': payment_serializer.data
                    }, status=status.HTTP_201_CREATED)
                    
                except SessionPayment.DoesNotExist:
                    # If payment not found, still return session data but log the issue
                    session_serializer = MentorSessionSerializer(session)
                    print("Warning: Payment object not found for session")
                    
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
    """API view to list user's sessions (both as student and mentor)"""
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
        
        # Check if cancellation is allowed (e.g., at least 24 hours before session)
        session_datetime = timezone.datetime.combine(session.scheduled_date, session.scheduled_time)
        if session_datetime <= timezone.now() + timezone.timedelta(hours=24):
            return Response({
                'success': False,
                'error': 'Cannot cancel session less than 24 hours before scheduled time'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        reason = request.data.get('reason', '')
        session.cancel_session(user, reason)
        
        # Handle refund if payment was made
        if hasattr(session, 'payment') and session.payment.status == 'completed':
            payment = session.payment
            payment.status = 'refunded'
            payment.refund_amount = payment.amount
            payment.refund_reason = f"Session cancelled by {'student' if session.student == user else 'mentor'}"
            payment.refunded_at = timezone.now()
            payment.save()
        
        serializer = MentorSessionSerializer(session)
        return Response({
            'success': True,
            'message': 'Session cancelled successfully',
            'data': serializer.data
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
    """API view to create session review"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request, session_id):
        session = get_object_or_404(
            MentorSession.objects.filter(
                Q(student=request.user) | Q(mentor__user=request.user),
                status='completed'
            ),
            id=session_id
        )
        
        serializer = SessionReviewSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(reviewer=request.user, session=session)
            return Response({
                'success': True,
                'message': 'Review created successfully',
                'data': serializer.data
            }, status=status.HTTP_201_CREATED)
        
        return Response({
            'success': False,
            'errors': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)


class SessionReviewsListAPIView(APIView):
    """API view to list session reviews"""
    permission_classes = [IsAuthenticated]
    pagination_class = StandardResultsSetPagination
    
    def get(self, request, session_id):
        session = get_object_or_404(
            MentorSession.objects.filter(
                Q(student=request.user) | Q(mentor__user=request.user)
            ),
            id=session_id
        )
        
        reviews = SessionReview.objects.filter(session=session)
        
        # Paginate results
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(reviews, request)
        
        if page is not None:
            serializer = SessionReviewSerializer(page, many=True)
            return paginator.get_paginated_response(serializer.data)
        
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

class FocusBuddyAvailabilityView(APIView):
    """
    Handle user availability status for focus buddy sessions
    GET: Get current availability status
    POST/PUT: Toggle availability status
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get user's current availability status"""
        try:
            availability = FocusBuddyAvailability.objects.get(user=request.user)
            serializer = FocusBuddyAvailabilitySerializer(availability)
            return Response(serializer.data)
        except FocusBuddyAvailability.DoesNotExist:
            # Create default availability record
            availability = FocusBuddyAvailability.objects.create(user=request.user)
            serializer = FocusBuddyAvailabilitySerializer(availability)
            return Response(serializer.data)
    
    def post(self, request):
        """Toggle or update availability status"""
        try:
            availability = FocusBuddyAvailability.objects.get(user=request.user)
        except FocusBuddyAvailability.DoesNotExist:
            availability = FocusBuddyAvailability.objects.create(user=request.user)
        
        serializer = FocusBuddyAvailabilitySerializer(
            availability, 
            data=request.data, 
            partial=True
        )
        
        if serializer.is_valid():
            # Check if user is currently in an active session
            active_session = FocusBuddySession.objects.filter(
                Q(user1=request.user) | Q(user2=request.user),
                status__in=['matching', 'matched', 'active']
            ).first()
            
            if active_session and request.data.get('is_available', False):
                return Response(
                    {'error': 'Cannot become available while in an active session'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            serializer.save()
            return Response(serializer.data)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class StartFocusSessionView(APIView):
    """
    Start a new focus session and find a match
    POST: Create session and match with available user
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Create a new focus session and find a match"""
        serializer = FocusBuddySessionCreateSerializer(
            data=request.data,
            context={'request': request}
        )
        
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if user is already in an active session
        existing_session = FocusBuddySession.objects.filter(
            Q(user1=request.user) | Q(user2=request.user),
            status__in=['matching', 'matched', 'active']
        ).first()
        
        if existing_session:
            return Response(
                {'error': 'You are already in an active session'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        with transaction.atomic():
            # Create the session
            session = serializer.save()
            
            # Set user as available
            availability, created = FocusBuddyAvailability.objects.get_or_create(
                user=request.user,
                defaults={'duration_minutes': session.duration_minutes}
            )
            availability.is_available = True
            availability.duration_minutes = session.duration_minutes
            availability.save()
            
            # Try to find a match
            match_found = self._find_match(session)
            
            if match_found:
                response_serializer = FocusBuddySessionSerializer(session, context={'request': request})
                return Response({
                    'session': response_serializer.data,
                    'match_found': True,
                    'message': 'Match found! Waiting for acceptance.'
                })
            else:
                response_serializer = FocusBuddySessionSerializer(session, context={'request': request})
                return Response({
                    'session': response_serializer.data,
                    'match_found': False,
                    'message': 'Searching for a study buddy...'
                })
    
    def _find_match(self, session):
        """Find and match with an available user"""
        user = session.user1
        
        # Get user's subjects (assuming User has a subjects relationship)
        if not hasattr(user, 'subjects'):
            return False
        
        user_subjects = set(user.subjects.values_list('id', flat=True))
        
        if not user_subjects:
            return False
        
        # Find available users with matching duration and common subjects
        available_users = FocusBuddyAvailability.objects.filter(
            is_available=True,
            duration_minutes=session.duration_minutes
        ).exclude(
            user=user
        ).select_related('user')
        
        # Filter users with common subjects
        potential_matches = []
        for availability in available_users:
            if hasattr(availability.user, 'subjects'):
                other_subjects = set(availability.user.subjects.values_list('id', flat=True))
                common_subjects = user_subjects.intersection(other_subjects)
                
                if common_subjects:
                    potential_matches.append({
                        'availability': availability,
                        'common_subjects': common_subjects,
                        'common_count': len(common_subjects)
                    })
        
        if not potential_matches:
            return False
        
        # Sort by number of common subjects (descending) and randomly select from top matches
        potential_matches.sort(key=lambda x: x['common_count'], reverse=True)
        
        # Select randomly from users with the highest common subject count
        max_common = potential_matches[0]['common_count']
        top_matches = [m for m in potential_matches if m['common_count'] == max_common]
        selected_match = random.choice(top_matches)
        
        # Update session with match
        session.user2 = selected_match['availability'].user
        session.status = 'matched'
        session.matched_at = timezone.now()
        session.match_timeout_at = timezone.now() + timedelta(minutes=5)  # 5 min to accept
        session.save()
        
        # Add common subjects to session
        common_subject_ids = selected_match['common_subjects']
        session.common_subjects.set(common_subject_ids)
        
        # Mark both users as unavailable for new matches
        selected_match['availability'].is_available = False
        selected_match['availability'].save()
        
        return True


class FocusSessionMatchResponseView(APIView):
    """
    Handle match acceptance/decline
    POST: Accept or decline a match
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Accept or decline a focus session match"""
        serializer = FocusBuddyMatchSerializer(
            data=request.data,
            context={'request': request}
        )
        
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        session_id = serializer.validated_data['session_id']
        action = serializer.validated_data['action']
        
        try:
            session = FocusBuddySession.objects.get(id=session_id)
        except FocusBuddySession.DoesNotExist:
            return Response(
                {'error': 'Session not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if match has timed out
        if session.match_timeout_at and timezone.now() > session.match_timeout_at:
            session.status = 'expired'
            session.save()
            return Response(
                {'error': 'Match has expired'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        with transaction.atomic():
            if action == 'accept':
                # Both users need to accept
                # For simplicity, we'll start the session immediately
                # In a real app, you might want both users to explicitly accept
                session.start_session()
                
                # Create initial system message
                FocusBuddyMessage.objects.create(
                    session=session,
                    message=f"Focus session started! Duration: {session.duration_minutes} minutes. Good luck with your studies!",
                    is_system_message=True
                )
                
                # Update user stats
                for user in [session.user1, session.user2]:
                    stats, created = FocusBuddyStats.objects.get_or_create(user=user)
                    if created:
                        stats.update_stats(session)
                
                message = 'Session started successfully!'
                
            else:  # decline
                session.end_session('cancelled')
                
                # Make both users available again
                for user in [session.user1, session.user2]:
                    if user:
                        availability, created = FocusBuddyAvailability.objects.get_or_create(user=user)
                        availability.is_available = True
                        availability.save()
                
                message = 'Match declined. You are now available for new matches.'
        
        response_serializer = FocusBuddySessionSerializer(session, context={'request': request})
        return Response({
            'session': response_serializer.data,
            'message': message
        })


class CurrentFocusSessionView(APIView):
    """
    Get current active focus session
    GET: Retrieve current session details
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get user's current active session"""
        session = FocusBuddySession.objects.filter(
            Q(user1=request.user) | Q(user2=request.user),
            status__in=['matching', 'matched', 'active']
        ).select_related('user1', 'user2').prefetch_related(
            'common_subjects', 'messages', 'feedback'
        ).first()
        
        if not session:
            return Response(
                {'message': 'No active session found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if session has expired
        if session.is_expired and session.status == 'active':
            session.end_session('expired')
        
        serializer = FocusBuddySessionDetailSerializer(session, context={'request': request})
        return Response(serializer.data)


class EndFocusSessionView(APIView):
    """
    End current focus session
    POST: End the active session
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """End the current focus session"""
        session = FocusBuddySession.objects.filter(
            Q(user1=request.user) | Q(user2=request.user),
            status='active'
        ).first()
        
        if not session:
            return Response(
                {'error': 'No active session found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        with transaction.atomic():
            session.end_session('completed')
            
            # Create completion message
            FocusBuddyMessage.objects.create(
                session=session,
                message="Focus session completed! Great job studying together!",
                is_system_message=True
            )
            
            # Update stats for both users
            for user in [session.user1, session.user2]:
                if user:
                    stats, created = FocusBuddyStats.objects.get_or_create(user=user)
                    stats.update_stats(session)
        
        serializer = FocusBuddySessionSerializer(session, context={'request': request})
        return Response({
            'session': serializer.data,
            'message': 'Session ended successfully!'
        })


class FocusSessionMessagesView(APIView):
    """
    Handle chat messages in focus sessions
    GET: Get messages for a session
    POST: Send a new message
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, session_id):
        """Get messages for a specific session"""
        try:
            session = FocusBuddySession.objects.get(
                id=session_id,
                status__in=['matched', 'active', 'completed']
            )
        except FocusBuddySession.DoesNotExist:
            return Response(
                {'error': 'Session not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if user is part of the session
        if request.user not in [session.user1, session.user2]:
            return Response(
                {'error': 'You are not part of this session'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        messages = session.messages.all()
        serializer = FocusBuddyMessageSerializer(messages, many=True)
        return Response(serializer.data)
    
    def post(self, request, session_id):
        """Send a message in the session"""
        try:
            session = FocusBuddySession.objects.get(
                id=session_id,
                status__in=['matched', 'active']
            )
        except FocusBuddySession.DoesNotExist:
            return Response(
                {'error': 'Session not found or not active'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if user is part of the session
        if request.user not in [session.user1, session.user2]:
            return Response(
                {'error': 'You are not part of this session'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        data = request.data.copy()
        data['session'] = session_id
        
        serializer = FocusBuddyMessageSerializer(
            data=data,
            context={'request': request}
        )
        
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class FocusSessionFeedbackView(APIView):
    """
    Handle session feedback
    POST: Submit feedback for a completed session
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Submit feedback for a completed session"""
        serializer = FocusBuddyFeedbackSerializer(
            data=request.data,
            context={'request': request}
        )
        
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        session_id = request.data.get('session')
        try:
            session = FocusBuddySession.objects.get(
                id=session_id,
                status='completed'
            )
        except FocusBuddySession.DoesNotExist:
            return Response(
                {'error': 'Completed session not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if user already provided feedback
        existing_feedback = FocusBuddyFeedback.objects.filter(
            session=session,
            reviewer=request.user
        ).first()
        
        if existing_feedback:
            return Response(
                {'error': 'You have already provided feedback for this session'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        with transaction.atomic():
            feedback = serializer.save()
            
            # Update the reviewed user's stats
            reviewed_user = feedback.reviewed_user
            stats, created = FocusBuddyStats.objects.get_or_create(user=reviewed_user)
            stats.update_stats(session, feedback.rating)
        
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class FocusBuddyStatsView(APIView):
    """
    Get user's focus buddy statistics
    GET: Retrieve current user's stats
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get user's focus buddy statistics"""
        stats, created = FocusBuddyStats.objects.get_or_create(user=request.user)
        serializer = FocusBuddyStatsSerializer(stats)
        return Response(serializer.data)


class FocusSessionHistoryView(APIView):
    """
    Get user's session history
    GET: Retrieve user's past sessions
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get user's session history"""
        sessions = FocusBuddySession.objects.filter(
            Q(user1=request.user) | Q(user2=request.user)
        ).select_related('user1', 'user2').order_by('-created_at')
        
        # Optional filtering
        status_filter = request.query_params.get('status')
        if status_filter:
            sessions = sessions.filter(status=status_filter)
        
        # Pagination
        limit = int(request.query_params.get('limit', 20))
        offset = int(request.query_params.get('offset', 0))
        
        total_count = sessions.count()
        sessions = sessions[offset:offset + limit]
        
        serializer = SessionHistorySerializer(
            sessions, 
            many=True, 
            context={'request': request}
        )
        
        return Response({
            'count': total_count,
            'results': serializer.data
        })


class AvailableUsersView(APIView):
    """
    Get list of available users for matching
    GET: Retrieve currently available users
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get list of available users"""
        duration = request.query_params.get('duration', 25)
        
        try:
            duration = int(duration)
        except ValueError:
            duration = 25
        
        available_users = FocusBuddyAvailability.objects.filter(
            is_available=True,
            duration_minutes=duration
        ).exclude(
            user=request.user
        ).select_related('user')
        
        # Filter out expired availabilities
        valid_users = []
        for availability in available_users:
            if not availability.is_expired:
                valid_users.append(availability)
        
        serializer = AvailableUsersSerializer(
            valid_users, 
            many=True, 
            context={'request': request}
        )
        
        return Response({
            'count': len(valid_users),
            'users': serializer.data
        })


class CancelFocusSessionView(APIView):
    """
    Cancel a focus session
    POST: Cancel current session
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """Cancel the current focus session"""
        session = FocusBuddySession.objects.filter(
            Q(user1=request.user) | Q(user2=request.user),
            status__in=['matching', 'matched', 'active']
        ).first()
        
        if not session:
            return Response(
                {'error': 'No active session found to cancel'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        with transaction.atomic():
            session.end_session('cancelled')
            
            # Make both users available again if they want to be
            for user in [session.user1, session.user2]:
                if user:
                    availability, created = FocusBuddyAvailability.objects.get_or_create(user=user)
                    # Don't automatically make them available - let them choose
                    availability.is_available = False
                    availability.save()
            
            # Create cancellation message
            FocusBuddyMessage.objects.create(
                session=session,
                message=f"Session cancelled by {request.user.name}",
                is_system_message=True
            )
        
        serializer = FocusBuddySessionSerializer(session, context={'request': request})
        return Response({
            'session': serializer.data,
            'message': 'Session cancelled successfully'
        })