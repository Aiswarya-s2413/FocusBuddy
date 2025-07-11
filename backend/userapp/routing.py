from . import consumers
from django.urls import re_path

websocket_urlpatterns = [
    re_path(r'ws/webrtc/(?P<session_id>[\w-]+)/$', consumers.WebRTCConsumer.as_asgi()),
    re_path(r'ws/mentor/notifications/$', consumers.MentorNotificationConsumer.as_asgi()),
    re_path(r'ws/mentor-session/(?P<session_id>[\w-]+)/$', consumers.WebRTCConsumer.as_asgi()),
] 