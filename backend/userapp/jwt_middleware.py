import logging
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import TokenError

logger = logging.getLogger(__name__)

@database_sync_to_async
def get_user_from_jwt(raw_token):
    User = get_user_model()
    try:
        token = AccessToken(raw_token)
        user_id = token.get("user_id")
        if user_id:
            return User.objects.get(id=user_id)
    except (TokenError, User.DoesNotExist, Exception) as e:
        logger.warning(f"JWT Auth error: {e}")
    return AnonymousUser()

class JWTWebSocketMiddleware:
    def __init__(self, inner):
        self.inner = inner

    async def __call__(self, scope, receive, send):
        from django.contrib.auth.models import AnonymousUser

        # Extract JWT from cookies
        headers = dict(scope.get("headers", []))
        cookies = headers.get(b"cookie", b"").decode()
        token = None

        for item in cookies.split(";"):
            if "=" in item:
                k, v = item.strip().split("=", 1)
                if k == "access":
                    token = v
                    break

        user = await get_user_from_jwt(token) if token else AnonymousUser()
        scope["user"] = user

        return await self.inner(scope, receive, send)

def JWTAuthMiddlewareStack(inner):
    return JWTWebSocketMiddleware(inner)
