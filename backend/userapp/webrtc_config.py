from django.conf import settings
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

# Default STUN servers (public and free)
DEFAULT_STUN_SERVERS = [
    'stun:stun.l.google.com:19302',
    'stun:stun1.l.google.com:19302',
    'stun:stun2.l.google.com:19302',
]

# FREE TURN/STUN servers 
FREE_TURN_SERVERS = [
    # Open Relay Project - Free TURN servers
    {
        'urls': 'turn:openrelay.metered.ca:80',
        'username': 'openrelayproject',
        'credential': 'openrelayproject'
    },
    {
        'urls': 'turn:openrelay.metered.ca:443',
        'username': 'openrelayproject',
        'credential': 'openrelayproject'
    },
    {
        'urls': 'turn:openrelay.metered.ca:443?transport=tcp',
        'username': 'openrelayproject',
        'credential': 'openrelayproject'
    },
    
    # Additional free TURN servers
    {
        'urls': 'turn:relay.backups.cz',
        'username': 'webrtc',
        'credential': 'webrtc'
    },
    {
        'urls': 'turn:relay.backups.cz?transport=tcp',
        'username': 'webrtc',
        'credential': 'webrtc'
    }
]

def get_ice_servers():
    """Get ICE servers configuration with free services"""
    ice_servers = []
    
    # Add free STUN servers (always include these)
    for stun_url in DEFAULT_STUN_SERVERS:
        ice_servers.append({'urls': stun_url})
    
    # Add free TURN servers
    ice_servers.extend(FREE_TURN_SERVERS)
    
    return ice_servers

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_webrtc_config(request):
    """Get WebRTC configuration including ICE servers"""
    return Response({
        'iceServers': get_ice_servers(),
        'iceTransportPolicy': 'all',  # Use both STUN and TURN
        'iceCandidatePoolSize': 10    # Pre-gather ICE candidates
    })
