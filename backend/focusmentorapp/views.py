from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.contrib.auth import logout
from .serializers import MentorSignupSerializer, MentorLoginSerializer, MentorProfileSerializer
from userapp.models import User
from rest_framework_simplejwt.tokens import AccessToken, RefreshToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.authentication import JWTAuthentication
import logging

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
                "message": "Signup successful",
                "user": {
                    "id": user.id,
                    "name": user.name,
                    "email": user.email,
                    "is_mentor": user.is_mentor,
                    "subjects": user.subjects,
                    "bio": user.bio,
                    "experience": user.experience
                }
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
                "mentor_access", data["access"], httponly=True, 
                secure=False, samesite="Lax", path="/"
            )
            response.set_cookie(
                "mentor_refresh", data["refresh"], httponly=True, 
                secure=False, samesite="Lax", path="/"
            )
            return response
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class MentorLogoutView(APIView):
    def post(self, request):
        try:
            response = Response({"message": "Logged out successfully"}, status=status.HTTP_200_OK)
            # Delete both cookies regardless of authentication status
            response.delete_cookie('mentor_access', path='/', samesite='Lax')
            response.delete_cookie('mentor_refresh', path='/', samesite='Lax')
            # Try to logout if user is authenticated
            if request.user.is_authenticated:
                logout(request)
            return response
        except Exception as e:
            logger.error(f"Error during logout: {str(e)}")
            # Still try to delete cookies even if there's an error
            response = Response({"message": "Logged out successfully"}, status=status.HTTP_200_OK)
            response.delete_cookie('mentor_access', path='/', samesite='Lax')
            response.delete_cookie('mentor_refresh', path='/', samesite='Lax')
            return response

class MentorProfileView(APIView):
    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            serializer = MentorProfileSerializer(request.user)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Error fetching mentor profile: {str(e)}")
            return Response(
                {"error": "An error occurred while fetching profile"},
                status=status.HTTP_400_BAD_REQUEST
            )

    def put(self, request):
        try:
            serializer = MentorProfileSerializer(request.user, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response({
                    "message": "Profile updated successfully",
                    "user": serializer.data
                }, status=status.HTTP_200_OK)
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Error updating mentor profile: {str(e)}")
            return Response(
                {"error": "An error occurred while updating profile"},
                status=status.HTTP_400_BAD_REQUEST
            )

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
