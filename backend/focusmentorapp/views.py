from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.contrib.auth import logout
from .serializers import *
from userapp.models import User, Subject
from rest_framework_simplejwt.tokens import AccessToken, RefreshToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.authentication import JWTAuthentication
import logging
from django.core.mail import send_mail
from django.conf import settings
from django.utils import timezone
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from userapp.authentication import MentorCookieJWTAuthentication
from django.shortcuts import get_object_or_404


logger = logging.getLogger(__name__)

class CookieJWTAuthentication(JWTAuthentication):
    def authenticate(self, request):
        # Get the token from cookies
        access_token = request.COOKIES.get('mentor_access')
        if not access_token:
            return None

        try:
            # Validate the token
            validated_token = self.get_validated_token(access_token)
            return self.get_user(validated_token), validated_token
        except (InvalidToken, TokenError) as e:
            return None

class MentorSignupView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = MentorSignupSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            # Generate tokens for the new user
            refresh = RefreshToken.for_user(user)
            response = Response({
                "message": "Signup successful. Please check your email for OTP verification.",
                "user": serializer.to_representation(user)
            }, status=status.HTTP_201_CREATED)
            
            # Set tokens in cookies
            response.set_cookie(
                "mentor_access", str(refresh.access_token), httponly=True, 
                secure=False, samesite="Lax", path="/"
            )
            response.set_cookie(
                "mentor_refresh", str(refresh), httponly=True, 
                secure=False, samesite="Lax", path="/"
            )
            return response
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class MentorLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = MentorLoginSerializer(data=request.data)
        if serializer.is_valid():
            data = serializer.validated_data
            response = Response({
                "message": "Login successful",
                "user": data["user"]
            }, status=status.HTTP_200_OK)
            
            # Set tokens in cookies
            response.set_cookie(
                "mentor_access", data["access"], httponly=False, 
                secure=False, samesite="Lax", path="/",domain='localhost'
            )
            response.set_cookie(
                "mentor_refresh", data["refresh"], httponly=False, 
                secure=False, samesite="Lax", path="/", domain='localhost'
            )
            return response
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class MentorLogoutView(APIView):
    permission_classes = [AllowAny]  # Changed from requiring authentication
    
    def post(self, request):
        try:
            response = Response({"message": "Logged out successfully"}, status=status.HTTP_200_OK)
            
            # Delete both cookies regardless of authentication status
            response.delete_cookie('mentor_access', path='/', samesite='Lax')
            response.delete_cookie('mentor_refresh', path='/', samesite='Lax')
            
            # Try to logout if user is authenticated, but don't require it
            if request.user.is_authenticated:
                logout(request)
                
            return response
        except Exception as e:
            logger.error(f"Error during logout: {str(e)}")
            
            # Still try to delete cookies even if there's an error
            response = Response({"message": "Logged out with warnings"}, status=status.HTTP_200_OK)
            response.delete_cookie('mentor_access', path='/', samesite='Lax')
            response.delete_cookie('mentor_refresh', path='/', samesite='Lax')
            
            return response


class MentorCheckAuthView(APIView):
    def get(self, request):
        try:
            # Get token from cookies
            access_token = request.COOKIES.get('mentor_access')
            
            if not access_token:
                return Response(
                    {"error": "Authentication credentials were not provided."},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            
            try:
                # Validate token
                AccessToken(access_token)
                # If token is valid, return success response
                return Response({
                    "message": "Authentication successful",
                    "user": {
                        "email": request.user.email if hasattr(request.user, 'email') else None,
                        "name": request.user.name if hasattr(request.user, 'name') else None,
                        "is_mentor": request.user.is_mentor if hasattr(request.user, 'is_mentor') else False
                    }
                }, status=status.HTTP_200_OK)
            except (InvalidToken, TokenError) as e:
                return Response(
                    {"error": "Invalid or expired token."},
                    status=status.HTTP_401_UNAUTHORIZED
                )
        except Exception as e:
            logger.error(f"Error checking authentication: {str(e)}")
            return Response(
                {"error": "An error occurred while checking authentication"},
                status=status.HTTP_400_BAD_REQUEST
            )

class MentorRefreshTokenView(APIView):
    def post(self, request):
        try:
            # Get refresh token from cookies
            refresh_token = request.COOKIES.get('mentor_refresh')
            
            if not refresh_token:
                return Response(
                    {"error": "Refresh token not provided."},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            
            try:
                # Validate refresh token
                refresh = RefreshToken(refresh_token)
                # Generate new access token
                access_token = str(refresh.access_token)
                
                response = Response({
                    "message": "Token refreshed successfully"
                }, status=status.HTTP_200_OK)
                
                # Set new access token in cookie
                response.set_cookie(
                    "mentor_access", access_token, httponly=True, 
                    secure=False, samesite="Lax", path="/"
                )
                
                return response
            except (InvalidToken, TokenError) as e:
                return Response(
                    {"error": "Invalid or expired refresh token."},
                    status=status.HTTP_401_UNAUTHORIZED
                )
        except Exception as e:
            logger.error(f"Error refreshing token: {str(e)}")
            return Response(
                {"error": "An error occurred while refreshing token"},
                status=status.HTTP_400_BAD_REQUEST
            )

class MentorOtpVerifyView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = MentorOtpVerifySerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            otp = serializer.validated_data['otp']
            try:
                user = User.objects.get(email=email, otp=otp, is_mentor=True)
                
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

class MentorResendOtpView(APIView):
    permission_classes = []
    authentication_classes = []
    
    def post(self, request):
        email = request.data.get('email')
        try:
            # Get mentor user specifically
            user = User.objects.get(email=email, is_mentor=True)
            
            # Generate new OTP
            otp = f"{random.randint(100000, 999999)}"
            print(f"Mentor OTP: {otp}")
            
            # Update user with new OTP
            user.otp = otp
            user.otp_created_at = timezone.now()  # Set OTP creation time
            user.save()

            # Send email with mentor-specific subject
            send_mail(
                subject="Your new Mentor OTP",
                message=f"Hello {user.name}, your new mentor verification OTP is {otp}",
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=False,
            )
            
            return Response({"message": "Mentor OTP resent successfully"}, status=status.HTTP_200_OK)
            
        except User.DoesNotExist:
            return Response({"error": "Mentor not found"}, status=status.HTTP_400_BAD_REQUEST)

class MentorSelectSubjectsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        try:
            subjects = Subject.objects.all()
            # Create a simple list of subjects with id and name
            subject_list = [{'id': subject.id, 'name': subject.name} for subject in subjects]
            return Response(subject_list, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Error fetching subjects: {str(e)}")
            return Response(
                {"error": "Failed to fetch subjects"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def post(self, request):
        serializer = MentorSubjectSelectionSerializer(data=request.data)
        if serializer.is_valid():
            try:
                user = User.objects.get(email=serializer.validated_data['email'], is_verified=True, is_mentor=True)
                subject_ids = serializer.validated_data['subjects']
                subjects = Subject.objects.filter(id__in=subject_ids)
                user.subjects.set(subjects)
                return Response({"message": "Subjects added successfully"}, status=status.HTTP_200_OK)
            except User.DoesNotExist:
                return Response({"error": "Mentor not found or not verified"}, status=status.HTTP_400_BAD_REQUEST)
            except Exception as e:
                logger.error(f"Error saving subjects: {str(e)}")
                return Response(
                    {"error": "Failed to save subjects"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class MentorForgotPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = MentorForgotPasswordSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            try:
                send_mail(
                    subject="Your FocusBuddy Password Reset OTP",
                    message=f"Hello {user.name}, your OTP for password reset is {user.otp}",
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[user.email],
                    fail_silently=False,
                )
                return Response({"message": "OTP has been sent to your email"}, status=status.HTTP_200_OK)
            except Exception as e:
                logger.error(f"Failed to send OTP email: {str(e)}")
                return Response(
                    {"error": "Failed to send OTP email. Please try again."},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class MentorVerifyForgotPasswordOTPView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = MentorVerifyForgotPasswordOTPSerializer(data=request.data)
        if serializer.is_valid():
            return Response({"message": "OTP verified successfully"}, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class MentorResetPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = MentorResetPasswordSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            return Response({"message": "Password reset successfully"}, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class MentorProfileUploadView(APIView):
    authentication_classes = [MentorCookieJWTAuthentication]
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    
    def get(self, request):
        """Get current mentor profile data"""
        try:
            # Ensure the user has a mentor profile
            mentor, created = Mentor.objects.get_or_create(user=request.user)
            
            # Check if the user is marked as a mentor
            if not request.user.is_mentor:
                request.user.is_mentor = True
                request.user.save()
                
            serializer = MentorProfileUploadSerializer(mentor)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Error fetching mentor profile: {str(e)}")
            return Response(
                {"error": "Failed to fetch mentor profile data"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @transaction.atomic
    def put(self, request):
        """Update mentor profile"""
        try:
            # Get or create mentor profile
            mentor, created = Mentor.objects.get_or_create(user=request.user)
            
            # Extract JSON data if present
            data = request.data.copy()
            
            if 'data' in data:
                # Parse the JSON data from the form
                import json
                json_data = json.loads(data.get('data', '{}'))
                
                # Extract expertise_level from the JSON data
                if 'expertise_level' in json_data:
                    data['expertise_level'] = json_data['expertise_level']
                
                # Extract other fields as needed
                if 'name' in json_data:
                    data['name'] = json_data['name']
                if 'bio' in json_data:
                    data['bio'] = json_data['bio']
                if 'subjects' in json_data:
                    data['subjects'] = ','.join(json_data['subjects'])
                if 'experience' in json_data:
                    data['experience'] = json_data['experience']
                if 'hourly_rate' in json_data:
                    data['hourly_rate'] = json_data['hourly_rate']
                    
                
            
            # Process the data
            serializer = MentorProfileUploadSerializer(mentor, data=data, partial=True)
            
            if serializer.is_valid():
                serializer.save()
                return Response({
                    "message": "Profile updated successfully",
                    "profile": serializer.data
                }, status=status.HTTP_200_OK)
            else:
                logger.error(f"Validation errors: {serializer.errors}")
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Error updating mentor profile: {str(e)}")
            return Response(
                {"error": f"An error occurred while updating the profile: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
            
    @transaction.atomic
    def post(self, request):
        return self.put(request)

class MentorProfileDisplayView(APIView):
    authentication_classes = [MentorCookieJWTAuthentication]  
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    
    def get(self, request, mentor_id=None):
        """Get mentor profile data"""
        try:
            if mentor_id:
                # Get specific mentor profile (for viewing others)
                mentor = get_object_or_404(
                    Mentor.objects.select_related('user').prefetch_related('user__subjects'),
                    user__id=mentor_id,
                    is_approved=True
                )
            else:
                # Get current user's mentor profile
                mentor = get_object_or_404(
                    Mentor.objects.select_related('user').prefetch_related('user__subjects'),
                    user=request.user
                )
                
                # Ensure user is marked as mentor
                if not request.user.is_mentor:
                    request.user.is_mentor = True
                    request.user.save()
            
            serializer = MentorProfileDisplaySerializer(mentor)
            return Response(serializer.data, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error fetching mentor profile: {str(e)}")
            return Response(
                {"error": "Failed to fetch mentor profile data"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @transaction.atomic
    def put(self, request):
        """Update current user's mentor profile"""
        try:
            # Get current user's mentor profile
            mentor = get_object_or_404(Mentor, user=request.user)
            
            # Handle form data with JSON
            data = request.data.copy()
            
            # Parse JSON data if present (similar to your upload view)
            if 'data' in data:
                json_data = json.loads(data.get('data', '{}'))
                
                # Map JSON fields to serializer fields
                field_mapping = {
                    'name': 'name',
                    'bio': 'bio',
                    'subjects': 'subjects',
                    'experience': 'experience',
                    'expertise_level': 'expertise_level',
                    'hourly_rate': 'hourly_rate',
                    'availability': 'availability',
                    'is_available': 'is_available'
                }
                
                for json_field, data_field in field_mapping.items():
                    if json_field in json_data:
                        if json_field == 'subjects' and isinstance(json_data[json_field], list):
                            data[data_field] = ','.join(json_data[json_field])
                        else:
                            data[data_field] = json_data[json_field]
            
            serializer = MentorProfileEditSerializer(mentor, data=data, partial=True)
            
            if serializer.is_valid():
                updated_mentor = serializer.save()
                return Response({
                    "message": "Profile updated successfully",
                    "profile": serializer.data
                }, status=status.HTTP_200_OK)
            else:
                logger.error(f"Validation errors: {serializer.errors}")
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            logger.error(f"Error updating mentor profile: {str(e)}")
            return Response(
                {"error": f"An error occurred while updating the profile: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class MentorAvailabilityView(APIView):
    authentication_classes = [MentorCookieJWTAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get mentor's availability"""
        try:
            mentor = get_object_or_404(Mentor, user=request.user)
            return Response({
                'success': True,
                'availability': mentor.availability
            })
        except Mentor.DoesNotExist:
            return Response({
                'success': False,
                'message': 'Mentor profile not found'
            }, status=status.HTTP_404_NOT_FOUND)
    
    def put(self, request):
        """Complete replacement of mentor's availability"""
        try:
            mentor = get_object_or_404(Mentor, user=request.user)
            serializer = MentorAvailabilitySerializer(mentor, data=request.data)
            
            if serializer.is_valid():
                updated_mentor = serializer.save()
                return Response({
                    'success': True,
                    'message': 'Availability updated successfully',
                    'availability': updated_mentor.availability
                })
            
            return Response({
                'success': False,
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
            
        except Mentor.DoesNotExist:
            return Response({
                'success': False,
                'message': 'Mentor profile not found'
            }, status=status.HTTP_404_NOT_FOUND)
    
    def patch(self, request):
        """Partial update of mentor's availability"""
        try:
            mentor = get_object_or_404(Mentor, user=request.user)
            serializer = MentorAvailabilitySerializer(mentor, data=request.data, partial=True)
            
            if serializer.is_valid():
                updated_mentor = serializer.save()
                return Response({
                    'success': True,
                    'message': 'Availability updated successfully',
                    'availability': updated_mentor.availability
                })
            
            return Response({
                'success': False,
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
            
        except Mentor.DoesNotExist:
            return Response({
                'success': False,
                'message': 'Mentor profile not found'
            }, status=status.HTTP_404_NOT_FOUND)

class MentorSessionListView(APIView):
    """
    API view to list mentor sessions for the authenticated user.
    Returns sessions where the user is either a student or a mentor.
    """
    authentication_classes = [MentorCookieJWTAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get list of mentor sessions for the authenticated user"""
        user = request.user
        
        # Check if user is a mentor
        try:
            mentor = user.mentor_profile
            # If user is a mentor, return sessions where they are the mentor
            sessions = MentorSession.objects.filter(
                mentor=mentor
            ).select_related(
                'student', 
                'mentor__user', 
                'cancelled_by'
            ).prefetch_related('subjects').order_by('-scheduled_date', '-scheduled_time')
        except:
            # If user is not a mentor, return sessions where they are the student
            sessions = MentorSession.objects.filter(
                student=user
            ).select_related(
                'student', 
                'mentor__user', 
                'cancelled_by'
            ).prefetch_related('subjects').order_by('-scheduled_date', '-scheduled_time')
        
        # Serialize the data
        serializer = MentorSessionSerializer(sessions, many=True)
        
        return Response({
            'success': True,
            'sessions': serializer.data
        })


class MentorSessionDetailView(APIView):
    """
    API view to retrieve and update a specific mentor session.
    Only allows access to sessions where the user is involved.
    """
    authentication_classes = [MentorCookieJWTAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get_session(self, request, pk):
        """Helper method to get session based on user permissions"""
        user = request.user
        
        # Allow access to sessions where user is either student or mentor
        queryset = MentorSession.objects.select_related(
            'student', 
            'mentor__user', 
            'cancelled_by'
        ).prefetch_related('subjects')
        
        # Filter based on user role
        try:
            mentor = user.mentor_profile
            queryset = queryset.filter(
                Q(mentor=mentor) | Q(student=user)
            )
        except:
            queryset = queryset.filter(student=user)
        
        return get_object_or_404(queryset, pk=pk)
    
    def get(self, request, pk):
        """Retrieve a specific mentor session"""
        try:
            session = self.get_session(request, pk)
            serializer = MentorSessionSerializer(session)
            
            return Response({
                'success': True,
                'session': serializer.data
            })
        except Exception as e:
            return Response({
                'success': False,
                'message': 'Session not found or access denied'
            }, status=status.HTTP_404_NOT_FOUND)
    
    def put(self, request, pk):
        """Complete update of a mentor session"""
        try:
            session = self.get_session(request, pk)
            serializer = MentorSessionSerializer(session, data=request.data)
            
            if serializer.is_valid():
                updated_session = serializer.save()
                return Response({
                    'success': True,
                    'message': 'Session updated successfully',
                    'session': MentorSessionSerializer(updated_session).data
                })
            
            return Response({
                'success': False,
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
            
        except Exception as e:
            return Response({
                'success': False,
                'message': 'Session not found or access denied'
            }, status=status.HTTP_404_NOT_FOUND)
    
    def patch(self, request, pk):
        """Partial update of a mentor session"""
        try:
            session = self.get_session(request, pk)
            serializer = MentorSessionSerializer(session, data=request.data, partial=True)
            
            if serializer.is_valid():
                updated_session = serializer.save()
                return Response({
                    'success': True,
                    'message': 'Session updated successfully',
                    'session': MentorSessionSerializer(updated_session).data
                })
            
            return Response({
                'success': False,
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
            
        except Exception as e:
            return Response({
                'success': False,
                'message': 'Session not found or access denied'
            }, status=status.HTTP_404_NOT_FOUND)


class StartMentorSessionView(APIView):
    authentication_classes = [MentorCookieJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def patch(self, request, session_id):
        try:
            session = MentorSession.objects.get(id=session_id, mentor__user=request.user)
        except MentorSession.DoesNotExist:
            return Response({"error": "Session not found or unauthorized"}, status=404)

        if session.status != 'confirmed':
            return Response({"error": "Only confirmed sessions can be started"}, status=400)

        # Update session status and timing
        session.started_at = timezone.now()
        session.status = 'ongoing'

        # Optional: Save WebRTC session info from frontend
        session.meeting_link = request.data.get("meeting_link", "")
        session.meeting_id = request.data.get("meeting_id", "")
        session.meeting_password = request.data.get("meeting_password", "")

        session.save()

        return Response({
            "success": True,
            "message": "Session started successfully",
            "session_id": session.id,
            "status": session.status,
            "student_id": session.student.id,
            "scheduled_time": session.scheduled_time,
            "scheduled_date": session.scheduled_date,
        })
class CancelMentorSessionView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [MentorCookieJWTAuthentication]

    def post(self, request, session_id):
        try:
            session = MentorSession.objects.get(id=session_id, mentor__user=request.user)
        except MentorSession.DoesNotExist:
            return Response({"error": "Session not found or unauthorized"}, status=404)

        if session.status in ['completed', 'cancelled']:
            return Response({"error": f"Cannot cancel a {session.status} session"}, status=400)

        session.cancel_session(cancelled_by_user=request.user, reason=request.data.get("reason"))
        serializer = MentorSessionSerializer(session)
        return Response(serializer.data)
