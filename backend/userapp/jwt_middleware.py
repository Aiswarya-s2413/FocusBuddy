import logging
from urllib.parse import parse_qs
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import TokenError, InvalidToken
from asgiref.sync import sync_to_async

logger = logging.getLogger(__name__)

@database_sync_to_async
def get_user_from_jwt(raw_token):
    User = get_user_model()
    try:
        logger.debug(f"[JWT] Attempting to decode token: {raw_token[:20]}...")
        
        # Validate and decode the token
        token = AccessToken(raw_token)
        user_id = token.get("user_id")
        
        logger.debug(f"[JWT] Extracted user_id from token: {user_id}")
        
        if user_id:
            try:
                user = User.objects.get(id=user_id)
                logger.info(f"[JWT] User resolved from token: {user.username} (ID: {user.id})")
                return user
            except User.DoesNotExist:
                logger.error(f"[JWT] User with ID {user_id} does not exist")
        else:
            logger.error("[JWT] No user_id found in token payload")
            
    except InvalidToken as e:
        logger.error(f"[JWT] Invalid token: {e}")
    except TokenError as e:
        logger.error(f"[JWT] Token error: {e}")
    except Exception as e:
        logger.error(f"[JWT] Unexpected error during token validation: {e}")
    
    logger.warning("[JWT] Returning AnonymousUser due to authentication failure")
    return AnonymousUser()

def parse_cookies(cookie_header):
    """Parse cookie header into a dictionary"""
    cookies = {}
    if cookie_header:
        for cookie in cookie_header.split(';'):
            if '=' in cookie:
                key, value = cookie.strip().split('=', 1)
                cookies[key] = value
    return cookies

class JWTWebSocketMiddleware:
    def __init__(self, inner):
        self.inner = inner

    async def __call__(self, scope, receive, send):
        # Parse query string
        query_string = scope.get('query_string', b'').decode()
        query_params = parse_qs(query_string)
        
        logger.debug(f"[JWT] Query string: {query_string}")
        logger.debug(f"[JWT] Parsed query params: {list(query_params.keys())}")
        
        # Get headers
        headers = dict(scope.get('headers', []))
        logger.debug(f"[JWT] Available headers: {list(headers.keys())}")
        
        # Try multiple ways to get the token
        token = None
        
        # Method 1: From query parameter 'token'
        if 'token' in query_params:
            token = query_params['token'][0]
            logger.debug("[JWT] Token found in 'token' query parameter")
        
        # Method 2: From query parameter 'access_token'
        elif 'access_token' in query_params:
            token = query_params['access_token'][0]
            logger.debug("[JWT] Token found in 'access_token' query parameter")
        
        # Method 3: From Authorization header
        elif b'authorization' in headers:
            auth_header = headers[b'authorization'].decode()
            if auth_header.startswith('Bearer '):
                token = auth_header[7:]  # Remove 'Bearer ' prefix
                logger.debug("[JWT] Token found in Authorization header")
        
        # Method 4: From cookies (THIS IS THE MISSING PIECE)
        elif b'cookie' in headers:
            cookie_header = headers[b'cookie'].decode()
            logger.debug(f"[JWT] Cookie header found: {cookie_header}")
            
            cookies = parse_cookies(cookie_header)
            logger.debug(f"[JWT] Parsed cookies: {list(cookies.keys())}")
            
            # Try 'access' cookie first (your frontend uses this)
            if 'access' in cookies:
                token = cookies['access']
                logger.debug("[JWT] Token found in 'access' cookie")
            # Fallback to 'access_token' cookie
            elif 'access_token' in cookies:
                token = cookies['access_token']
                logger.debug("[JWT] Token found in 'access_token' cookie")
        
        if token:
            logger.debug(f"[JWT] Token extracted (first 20 chars): {token[:20]}...")
            user = await get_user_from_jwt(token)
        else:
            logger.warning("[JWT] No token found in request")
            user = AnonymousUser()

        logger.info(f"[JWT] Final user set in scope: {user} (Anonymous: {user.is_anonymous})")
        scope["user"] = user
        
        return await self.inner(scope, receive, send)

def JWTAuthMiddlewareStack(inner):
    return JWTWebSocketMiddleware(inner)

class JWTAuthMiddleware:
    def __init__(self, inner):
        self.inner = inner

    async def __call__(self, scope, receive, send):
        headers = dict(scope.get('headers', {}))
        cookies = headers.get(b'cookie', b'').decode()
        token = None
        # Try to get token from cookies
        if 'mentor_access=' in cookies:
            token = cookies.split('mentor_access=')[1].split(';')[0]
        elif 'access=' in cookies:
            token = cookies.split('access=')[1].split(';')[0]
        # If not in cookies, try query string (for WebSocket auth)
        if not token:
            query_string = scope.get('query_string', b'').decode()
            query_params = parse_qs(query_string)
            if 'token' in query_params:
                token = query_params['token'][0]
        # Validate token and set user
        if token:
            try:
                validated_token = AccessToken(token) # Changed from UntypedToken to AccessToken
                user_id = validated_token.get('user_id')
                user = await sync_to_async(get_user_from_jwt)(token) # Changed from User.objects.get to get_user_from_jwt
                scope['user'] = user
            except (InvalidToken, TokenError, User.DoesNotExist):
                scope['user'] = AnonymousUser()
        else:
            scope['user'] = AnonymousUser()
        return await self.inner(scope, receive, send)