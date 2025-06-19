import os
import django
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator
from django.urls import re_path

# Initialize Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

# Import after setup
from userapp import consumers
from userapp.jwt_middleware import JWTAuthMiddlewareStack  # Use the middleware stack, not the get_user_from_jwt coroutine

# WebSocket URL patterns
websocket_urlpatterns = [
    re_path(r'ws/webrtc/(?P<session_id>\w+)/$', consumers.WebRTCConsumer.as_asgi()),
]

# Django ASGI application
django_asgi_app = get_asgi_application()

# Final ASGI application
application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": AllowedHostsOriginValidator(
        JWTAuthMiddlewareStack(
            URLRouter(websocket_urlpatterns)
        )
    ),
})
