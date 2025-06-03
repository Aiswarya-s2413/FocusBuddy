from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
import logging

logger = logging.getLogger(__name__)

class UserCookieJWTAuthentication(JWTAuthentication):
    """Authentication for regular users"""
    def authenticate(self, request):
        raw_token = request.COOKIES.get('access')  # User token

        if not raw_token:
            # Fallback to Authorization header
            header = self.get_header(request)
            if header is not None:
                raw_token = self.get_raw_token(header)
            
            if not raw_token:
                return None

        try:
            validated_token = self.get_validated_token(raw_token)
            user = self.get_user(validated_token)
            return (user, validated_token)
        except TokenError as e:
            logger.error(f"User token validation failed: {str(e)}")
            return None
        except Exception as e:
            logger.error(f"User authentication failed: {str(e)}")
            return None

class MentorCookieJWTAuthentication(JWTAuthentication):
    """Authentication for mentors"""
    def authenticate(self, request):
        raw_token = request.COOKIES.get('mentor_access')  # Mentor token

        if not raw_token:
            # Fallback to Authorization header
            header = self.get_header(request)
            if header is not None:
                raw_token = self.get_raw_token(header)
            
            if not raw_token:
                return None

        try:
            validated_token = self.get_validated_token(raw_token)
            user = self.get_user(validated_token)
            return (user, validated_token)
        except TokenError as e:
            logger.error(f"Mentor token validation failed: {str(e)}")
            return None
        except Exception as e:
            logger.error(f"Mentor authentication failed: {str(e)}")
            return None

class AdminCookieJWTAuthentication(JWTAuthentication):
    """Authentication for admins"""
    def authenticate(self, request):
        raw_token = request.COOKIES.get('admin_access')  # Admin token

        if not raw_token:
            # Fallback to Authorization header
            header = self.get_header(request)
            if header is not None:
                raw_token = self.get_raw_token(header)
            
            if not raw_token:
                return None

        try:
            validated_token = self.get_validated_token(raw_token)
            user = self.get_user(validated_token)
            return (user, validated_token)
        except TokenError as e:
            logger.error(f"Admin token validation failed: {str(e)}")
            return None
        except Exception as e:
            logger.error(f"Admin authentication failed: {str(e)}")
            return None
