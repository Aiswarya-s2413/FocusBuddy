import logging
from channels.middleware import BaseMiddleware
from channels.db import database_sync_to_async
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import TokenError

logger = logging.getLogger(__name__)

@database_sync_to_async
def get_user_from_jwt(raw_token):
    """
    Get user from JWT token using the same validation as your UserCookieJWTAuthentication
    """
    # Import Django models inside the function to avoid initialization issues
    from django.contrib.auth import get_user_model
    from django.contrib.auth.models import AnonymousUser
    
    User = get_user_model()
    
    try:
        # Validate the token using SimpleJWT
        validated_token = AccessToken(raw_token)
        
        # Get user_id from token payload
        user_id = validated_token.get('user_id')
        
        if user_id:
            user = User.objects.get(id=user_id)
            logger.info(f"JWT authentication successful for user: {user.id}")
            return user
        else:
            logger.warning("No user_id in JWT payload")
            return AnonymousUser()
            
    except TokenError as e:
        logger.warning(f"JWT token validation failed: {str(e)}")
        return AnonymousUser()
    except User.DoesNotExist:
        logger.warning(f"User with id {user_id} does not exist")
        return AnonymousUser()
    except Exception as e:
        logger.error(f"Error in JWT authentication: {e}")
        return AnonymousUser()

class JWTWebSocketMiddleware(BaseMiddleware):
    """
    JWT authentication middleware for WebSocket connections
    """
    
    async def __call__(self, scope, receive, send):
        # Import here to avoid Django initialization issues
        from django.contrib.auth.models import AnonymousUser
        
        # Only process websocket connections
        if scope["type"] != "websocket":
            return await super().__call__(scope, receive, send)
        
        # Get cookies from headers
        cookies = {}
        for header_name, header_value in scope.get("headers", []):
            if header_name == b"cookie":
                cookie_header = header_value.decode()
                # Parse cookies
                for cookie in cookie_header.split(';'):
                    if '=' in cookie:
                        key, value = cookie.strip().split('=', 1)
                        cookies[key] = value
                break
        
        # Extract JWT token from cookies - matching your 'access' cookie name
        jwt_token = cookies.get('access')
        
        if jwt_token:
            logger.info(f"JWT token found in cookies: {jwt_token[:20]}...")
            user = await get_user_from_jwt(jwt_token)
            scope["user"] = user
        else:
            logger.warning("No JWT token found in 'access' cookie")
            scope["user"] = AnonymousUser()
        
        return await super().__call__(scope, receive, send)

def JWTAuthMiddlewareStack(inner):
    """
    JWT authentication middleware stack for WebSocket connections
    """
    return JWTWebSocketMiddleware(inner)