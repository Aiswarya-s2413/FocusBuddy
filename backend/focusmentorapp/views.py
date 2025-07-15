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
from django.db.models import Sum
from decimal import Decimal
from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger



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
        logger.info("Entered MentorSignupView.post")
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
            logger.info("MentorSignupView.post successful")
            return response
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class MentorLoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        logger.info("Entered MentorLoginView.post")
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
                secure=False, samesite="Lax", path="/"
            )
            response.set_cookie(
                "mentor_refresh", data["refresh"], httponly=False, 
                secure=False, samesite="Lax", path="/"
            )
            logger.info("MentorLoginView.post successful")
            return response
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class MentorLogoutView(APIView):
    permission_classes = [AllowAny]  # Changed from requiring authentication
    
    def post(self, request):
        logger.info("Entered MentorLogoutView.post")
        try:
            response = Response({"message": "Logged out successfully"}, status=status.HTTP_200_OK)
            
            # Delete both cookies regardless of authentication status
            response.delete_cookie('mentor_access', path='/', samesite='Lax')
            response.delete_cookie('mentor_refresh', path='/', samesite='Lax')
            
            # Try to logout if user is authenticated, but don't require it
            if request.user.is_authenticated:
                logout(request)
            logger.info("MentorLogoutView.post successful")
            return response
        except Exception as e:
            logger.error(f"Error during logout: {str(e)}", exc_info=True)
            # Still try to delete cookies even if there's an error
            response = Response({"message": "Logged out with warnings"}, status=status.HTTP_200_OK)
            response.delete_cookie('mentor_access', path='/', samesite='Lax')
            response.delete_cookie('mentor_refresh', path='/', samesite='Lax')
            return response


class MentorCheckAuthView(APIView):
    def get(self, request):
        logger.info("Entered MentorCheckAuthView.get")
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
                logger.info("MentorCheckAuthView.get successful")
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
            logger.error(f"Error checking authentication: {str(e)}", exc_info=True)
            return Response(
                {"error": "An error occurred while checking authentication"},
                status=status.HTTP_400_BAD_REQUEST
            )

class MentorRefreshTokenView(APIView):
    def post(self, request):
        logger.info("Entered MentorRefreshTokenView.post")
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
                logger.info("MentorRefreshTokenView.post successful")
                return response
            except (InvalidToken, TokenError) as e:
                return Response(
                    {"error": "Invalid or expired refresh token."},
                    status=status.HTTP_401_UNAUTHORIZED
                )
        except Exception as e:
            logger.error(f"Error refreshing token: {str(e)}", exc_info=True)
            return Response(
                {"error": "An error occurred while refreshing token"},
                status=status.HTTP_400_BAD_REQUEST
            )

class MentorOtpVerifyView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        logger.info("Entered MentorOtpVerifyView.post")
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
                logger.info("MentorOtpVerifyView.post successful")
                return Response({"message": "OTP verified"}, status=status.HTTP_200_OK)
            except User.DoesNotExist:
                return Response({"error": "Invalid Email or OTP"}, status=status.HTTP_400_BAD_REQUEST)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class MentorResendOtpView(APIView):
    permission_classes = []
    authentication_classes = []
    
    def post(self, request):
        logger.info("Entered MentorResendOtpView.post")
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
            logger.info("MentorResendOtpView.post successful")
            return Response({"message": "Mentor OTP resent successfully"}, status=status.HTTP_200_OK)
            
        except User.DoesNotExist:
            return Response({"error": "Mentor not found"}, status=status.HTTP_400_BAD_REQUEST)

class MentorSelectSubjectsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        logger.info("Entered MentorSelectSubjectsView.get")
        try:
            subjects = Subject.objects.all()
            # Create a simple list of subjects with id and name
            subject_list = [{'id': subject.id, 'name': subject.name} for subject in subjects]
            logger.info("MentorSelectSubjectsView.get successful")
            return Response(subject_list, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Error fetching subjects: {str(e)}", exc_info=True)
            return Response(
                {"error": "Failed to fetch subjects"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def post(self, request):
        logger.info("Entered MentorSelectSubjectsView.post")
        serializer = MentorSubjectSelectionSerializer(data=request.data)
        if serializer.is_valid():
            try:
                user = User.objects.get(email=serializer.validated_data['email'], is_verified=True, is_mentor=True)
                subject_ids = serializer.validated_data['subjects']
                subjects = Subject.objects.filter(id__in=subject_ids)
                user.subjects.set(subjects)
                logger.info("MentorSelectSubjectsView.post successful")
                return Response({"message": "Subjects added successfully"}, status=status.HTTP_200_OK)
            except User.DoesNotExist:
                return Response({"error": "Mentor not found or not verified"}, status=status.HTTP_400_BAD_REQUEST)
            except Exception as e:
                logger.error(f"Error saving subjects: {str(e)}", exc_info=True)
                return Response(
                    {"error": "Failed to save subjects"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class MentorForgotPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        logger.info("Entered MentorForgotPasswordView.post")
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
                logger.info("MentorForgotPasswordView.post successful")
                return Response({"message": "OTP has been sent to your email"}, status=status.HTTP_200_OK)
            except Exception as e:
                logger.error(f"Failed to send OTP email: {str(e)}", exc_info=True)
                return Response(
                    {"error": "Failed to send OTP email. Please try again."},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class MentorVerifyForgotPasswordOTPView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        logger.info("Entered MentorVerifyForgotPasswordOTPView.post")
        serializer = MentorVerifyForgotPasswordOTPSerializer(data=request.data)
        if serializer.is_valid():
            logger.info("MentorVerifyForgotPasswordOTPView.post successful")
            return Response({"message": "OTP verified successfully"}, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class MentorResetPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        logger.info("Entered MentorResetPasswordView.post")
        serializer = MentorResetPasswordSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            logger.info("MentorResetPasswordView.post successful")
            return Response({"message": "Password reset successfully"}, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class MentorProfileUploadView(APIView):
    authentication_classes = [MentorCookieJWTAuthentication]
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    
    def get(self, request):
        """Get current mentor profile data"""
        logger.info("Entered MentorProfileUploadView.get")
        try:
            # Ensure the user has a mentor profile
            mentor, created = Mentor.objects.get_or_create(user=request.user)
            
            # Check if the user is marked as a mentor
            if not request.user.is_mentor:
                request.user.is_mentor = True
                request.user.save()
            
            serializer = MentorProfileUploadSerializer(mentor)
            logger.info("MentorProfileUploadView.get successful")
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Error fetching mentor profile: {str(e)}", exc_info=True)
            return Response(
                {"error": "Failed to fetch mentor profile data"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @transaction.atomic
    def put(self, request):
        """Update mentor profile"""
        logger.info("Entered MentorProfileUploadView.put")
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
                logger.info("MentorProfileUploadView.put successful")
                return Response({
                    "message": "Profile updated successfully",
                    "profile": serializer.data
                }, status=status.HTTP_200_OK)
            else:
                logger.error(f"Validation errors: {serializer.errors}")
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Error updating mentor profile: {str(e)}", exc_info=True)
            return Response(
                {"error": f"An error occurred while updating the profile: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
            
    @transaction.atomic
    def post(self, request):
        logger.info("Entered MentorProfileUploadView.post (calls put)")
        return self.put(request)

class MentorProfileDisplayView(APIView):
    authentication_classes = [MentorCookieJWTAuthentication]  
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    
    def get(self, request, mentor_id=None):
        """Get mentor profile data"""
        logger.info("Entered MentorProfileDisplayView.get")
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
            logger.info("MentorProfileDisplayView.get successful")
            return Response(serializer.data, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error fetching mentor profile: {str(e)}", exc_info=True)
            return Response(
                {"error": "Failed to fetch mentor profile data"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @transaction.atomic
    def put(self, request):
        """Update current user's mentor profile"""
        logger.info("Entered MentorProfileDisplayView.put")
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
                logger.info("MentorProfileDisplayView.put successful")
                return Response({
                    "message": "Profile updated successfully",
                    "profile": serializer.data
                }, status=status.HTTP_200_OK)
            else:
                logger.error(f"Validation errors: {serializer.errors}")
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            logger.error(f"Error updating mentor profile: {str(e)}", exc_info=True)
            return Response(
                {"error": f"An error occurred while updating the profile: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class MentorAvailabilityView(APIView):
    authentication_classes = [MentorCookieJWTAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """Get mentor's availability"""
        logger.info("Entered MentorAvailabilityView.get")
        try:
            mentor = get_object_or_404(Mentor, user=request.user)
            logger.info("MentorAvailabilityView.get successful")
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
        logger.info("Entered MentorAvailabilityView.put")
        try:
            mentor = get_object_or_404(Mentor, user=request.user)
            serializer = MentorAvailabilitySerializer(mentor, data=request.data)
            
            if serializer.is_valid():
                updated_mentor = serializer.save()
                logger.info("MentorAvailabilityView.put successful")
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
        logger.info("Entered MentorAvailabilityView.patch")
        try:
            mentor = get_object_or_404(Mentor, user=request.user)
            serializer = MentorAvailabilitySerializer(mentor, data=request.data, partial=True)
            
            if serializer.is_valid():
                updated_mentor = serializer.save()
                logger.info("MentorAvailabilityView.patch successful")
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
        logger.info("Entered MentorSessionListView.get")
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
        logger.info("MentorSessionListView.get successful")
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
        logger.info("Entered MentorSessionDetailView.get")
        try:
            session = self.get_session(request, pk)
            serializer = MentorSessionSerializer(session)
            logger.info("MentorSessionDetailView.get successful")
            return Response({
                'success': True,
                'session': serializer.data
            })
        except Exception as e:
            logger.error(f"Error in MentorSessionDetailView.get: {str(e)}", exc_info=True)
            return Response({
                'success': False,
                'message': 'Session not found or access denied'
            }, status=status.HTTP_404_NOT_FOUND)
    
    def put(self, request, pk):
        """Complete update of a mentor session"""
        logger.info("Entered MentorSessionDetailView.put")
        try:
            session = self.get_session(request, pk)
            serializer = MentorSessionSerializer(session, data=request.data)
            
            if serializer.is_valid():
                updated_session = serializer.save()
                logger.info("MentorSessionDetailView.put successful")
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
            logger.error(f"Error in MentorSessionDetailView.put: {str(e)}", exc_info=True)
            return Response({
                'success': False,
                'message': 'Session not found or access denied'
            }, status=status.HTTP_404_NOT_FOUND)
    
    def patch(self, request, pk):
        """Partial update of a mentor session"""
        logger.info("Entered MentorSessionDetailView.patch")
        try:
            session = self.get_session(request, pk)
            serializer = MentorSessionSerializer(session, data=request.data, partial=True)
            
            if serializer.is_valid():
                updated_session = serializer.save()
                logger.info("MentorSessionDetailView.patch successful")
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
            logger.error(f"Error in MentorSessionDetailView.patch: {str(e)}", exc_info=True)
            return Response({
                'success': False,
                'message': 'Session not found or access denied'
            }, status=status.HTTP_404_NOT_FOUND)


class StartMentorSessionView(APIView):
    authentication_classes = [MentorCookieJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def patch(self, request, session_id):
        logger.info("Entered StartMentorSessionView.patch")
        try:
            session = MentorSession.objects.get(id=session_id, mentor__user=request.user)
        except MentorSession.DoesNotExist:
            logger.error("Session not found or unauthorized in StartMentorSessionView.patch")
            return Response({"error": "Session not found or unauthorized"}, status=404)

        if session.status != 'confirmed':
            logger.warning("Attempt to start non-confirmed session in StartMentorSessionView.patch")
            return Response({"error": "Only confirmed sessions can be started"}, status=400)

        # Update session status and timing
        session.started_at = timezone.now()
        session.status = 'ongoing'

        # Optional: Save WebRTC session info from frontend
        session.meeting_link = request.data.get("meeting_link", "")
        session.meeting_id = request.data.get("meeting_id", "")
        session.meeting_password = request.data.get("meeting_password", "")

        session.save()
        logger.info("StartMentorSessionView.patch successful")
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
        logger.info("Entered CancelMentorSessionView.post")
        try:
            session = MentorSession.objects.get(id=session_id, mentor__user=request.user)
        except MentorSession.DoesNotExist:
            logger.error("Session not found or unauthorized in CancelMentorSessionView.post")
            return Response({"error": "Session not found or unauthorized"}, status=404)

        if session.status in ['completed', 'cancelled']:
            logger.warning(f"Attempt to cancel a {session.status} session in CancelMentorSessionView.post")
            return Response({"error": f"Cannot cancel a {session.status} session"}, status=400)

        session.cancel_session(cancelled_by_user=request.user, reason=request.data.get("reason"))
        serializer = MentorSessionSerializer(session)
        logger.info("CancelMentorSessionView.post successful")
        return Response(serializer.data)

class MentorWalletView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [MentorCookieJWTAuthentication]

    def get(self, request):
        logger.info("Entered MentorWalletView.get")
        try:
            mentor = request.user.mentor_profile
        except Mentor.DoesNotExist:
            logger.error("Mentor profile not found in MentorWalletView.get")
            return Response(
                {'error': 'Mentor profile not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )

        try:
            # Pagination parameters
            page = request.GET.get('page', 1)
            page_size = request.GET.get('page_size', 10)

            try:
                page_size = max(5, min(50, int(page_size)))
            except (ValueError, TypeError):
                page_size = 10

            all_earnings = MentorEarnings.objects.filter(mentor=mentor).select_related(
                'session', 'session__student'
            ).prefetch_related('session__subjects')

            # Wallet summary
            wallet_summary = self.calculate_wallet_summary(mentor, all_earnings)

            # Pagination
            earnings_queryset = all_earnings.order_by('-created_at')
            paginator = Paginator(earnings_queryset, page_size)

            try:
                earnings_page = paginator.page(page)
            except PageNotAnInteger:
                earnings_page = paginator.page(1)
            except EmptyPage:
                earnings_page = paginator.page(paginator.num_pages)

            # Serialize paginated earnings
            earnings_serializer = MentorEarningsSerializer(earnings_page, many=True)

            pagination_info = {
                'current_page': earnings_page.number,
                'total_pages': paginator.num_pages,
                'total_items': paginator.count,
                'page_size': page_size,
                'has_next': earnings_page.has_next(),
                'has_previous': earnings_page.has_previous(),
                'next_page': earnings_page.next_page_number() if earnings_page.has_next() else None,
                'previous_page': earnings_page.previous_page_number() if earnings_page.has_previous() else None,
            }

            data = {
                'wallet_summary': wallet_summary,
                'earnings': earnings_serializer.data,
                'earnings_count': paginator.count,
                'pagination': pagination_info
            }
            logger.info("MentorWalletView.get successful")
            return Response(data, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Error in MentorWalletView.get: {str(e)}", exc_info=True)
            return Response(
                {'error': f'Failed to fetch wallet data: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def calculate_wallet_summary(self, mentor, earnings):
        now = timezone.now()
        current_month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        # Only include non-cancelled sessions in wallet calculations
        non_cancelled_earnings = earnings.exclude(session__status='cancelled')

        total_earnings = non_cancelled_earnings.aggregate(
            total=Sum('mentor_earning')
        )['total'] or Decimal('0.00')

        available_balance = total_earnings

        pending_earnings = non_cancelled_earnings.filter(
            payout_status__in=['pending', 'processing']
        ).aggregate(
            total=Sum('mentor_earning')
        )['total'] or Decimal('0.00')

        this_month_earnings = non_cancelled_earnings.filter(
            created_at__gte=current_month_start
        ).aggregate(
            total=Sum('mentor_earning')
        )['total'] or Decimal('0.00')

        total_sessions = MentorSession.objects.filter(mentor=mentor).exclude(status='cancelled').count()

        return {
            'total_earnings': total_earnings,
            'available_balance': available_balance,
            'pending_earnings': pending_earnings,
            'total_sessions': total_sessions,
            'this_month_earnings': this_month_earnings
        }

class MentorSessionReviewListView(APIView):
    authentication_classes = [MentorCookieJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        logger.info("Entered MentorSessionReviewListView.get")
        try:
            mentor = request.user.mentor_profile
        except Mentor.DoesNotExist:
            logger.error("Mentor profile not found in MentorSessionReviewListView.get")
            return Response({'error': 'Mentor profile not found'}, status=404)

        # Get all reviews for sessions where this mentor is the mentor
        reviews = SessionReview.objects.filter(session__mentor=mentor).select_related('session', 'session__student', 'session__mentor__user')
        serializer = MentorSessionReviewSerializer(reviews, many=True)
        logger.info("MentorSessionReviewListView.get successful")
        return Response({'success': True, 'reviews': serializer.data})