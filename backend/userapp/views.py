from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import *
from .serializers import *
from django.core.mail import send_mail
from django.conf import settings
import logging
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication

from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError

logger = logging.getLogger(__name__)

class SignupView(APIView):
    def post(self, request):
        logger.info("Received signup request with data: %s", request.data)
        serializer = SignupSerializer(data=request.data)
        
        if serializer.is_valid():
            logger.info("Serializer is valid, creating user")
            user = serializer.save()
            otp = user.otp
            
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
                return Response({"message": "OTP sent to your email"}, status=status.HTTP_201_CREATED)
            except Exception as e:
                logger.error("Failed to send OTP email: %s", str(e))
                # Delete the user if email sending fails
                user.delete()
                return Response(
                    {"error": "Failed to send OTP email. Please try again."},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
        
        logger.warning("Serializer validation failed: %s", serializer.errors)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class OtpVerifyView(APIView):
    def post(self, request):
        serializer = OtpVerifySerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            otp = serializer.validated_data['otp']
            try:
                user = User.objects.get(email=email, otp=otp)
                user.is_verified = True
                user.save()
                return Response({"message": "OTP verified"}, status=status.HTTP_200_OK)
            except User.DoesNotExist:
                return Response({"error": "Invalid Email or OTP"}, status=status.HTTP_400_BAD_REQUEST)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class SelectSubjectsView(APIView):
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

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            data = serializer.validated_data
            response = Response({"message": "Login successful", "user": data["user"]}, status=status.HTTP_200_OK)
            # Set JWT tokens in HttpOnly cookies
            response.set_cookie(
                "access", data["access"], httponly=True, 
                secure=False, samesite="Lax", path="/"
                # Removed domain parameter for localhost
            )
            response.set_cookie(
                "refresh", data["refresh"], httponly=True, 
                secure=False, samesite="Lax", path="/"
                # Removed domain parameter for localhost
            )
            return response
        logger.warning("Login failed with errors: %s", serializer.errors)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class ForgotPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({"message": "OTP has been sent to your email"}, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class VerifyForgotPasswordOTPView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = VerifyForgotPasswordOTPSerializer(data=request.data)
        if serializer.is_valid():
            return Response({"message": "OTP verified successfully"}, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class ResetPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        if serializer.is_valid():
            serializer.update(None, serializer.validated_data)
            return Response({"message": "Password reset successfully"}, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class LogoutView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        response = Response({"message": "Logged out successfully"}, status=status.HTTP_200_OK)
        
        # Clear the JWT cookies with exact same parameters as when setting them
        response.delete_cookie(
            'access', 
            path='/',
            domain='localhost',  # Include if you used it in login
            samesite='Lax'
        )
        response.delete_cookie(
            'refresh', 
            path='/',
            domain='localhost',  # Include if you used it in login
            samesite='Lax'
        )
        
        # For debugging
        print("Clearing cookies:", request.COOKIES)
        
        return response


class UpdateProfileView(APIView):
    permission_classes = [IsAuthenticated]

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
            except (InvalidToken, TokenError) as e:
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
            
            return Response({
                "message": "Profile updated successfully",
                "user": {
                    "name": user.name,
                    "email": user.email
                }
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error updating profile: {str(e)}")
            return Response(
                {"error": "An error occurred while updating profile"},
                status=status.HTTP_400_BAD_REQUEST
            )
