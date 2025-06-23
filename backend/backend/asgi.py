import os
import django
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator
from django.urls import re_path

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from userapp import consumers
from userapp.jwt_middleware import JWTAuthMiddlewareStack

websocket_urlpatterns = [
    re_path(r'ws/webrtc/(?P<session_id>[\w-]+)/$', consumers.WebRTCConsumer.as_asgi()),

]

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": AllowedHostsOriginValidator(
        JWTAuthMiddlewareStack(
            URLRouter(websocket_urlpatterns)
        )
    ),
})
