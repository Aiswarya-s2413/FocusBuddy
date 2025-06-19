import json
import asyncio
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from .models import FocusBuddySession

logger = logging.getLogger(__name__)

class WebRTCConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.session_id = self.scope['url_route']['kwargs']['session_id']
        self.room_group_name = f'webrtc_session_{self.session_id}'
        
        # Get the authenticated user from scope
        self.user = self.scope["user"]
        
        # Log connection attempt
        logger.info(f"WebSocket connection attempt started")
        logger.info(f"Session ID: {self.session_id}")
        logger.info(f"Room group name: {self.room_group_name}")
        logger.info(f"User from scope: {self.user}")
        
        # Reject connection if user is not authenticated
        if self.user.is_anonymous:
            logger.warning("User is anonymous, closing connection")
            return
        
        # Accept the connection if user is authenticated
        await self.accept()
        
        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        logger.info(f"User {self.user.id} connected to session {self.session_id}")

    async def disconnect(self, close_code):
        logger.info(f"WebSocket disconnected with code: {close_code}")
        
        # Leave room group
        if hasattr(self, 'room_group_name'):
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )
            
            # Notify that user left
            if hasattr(self, 'scope') and self.scope["user"]:
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'user_left',
                        'user_id': self.scope["user"].id
                    }
                )

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            logger.info(f"Received message type: {message_type}")
            
            # Handle different WebRTC signaling messages
            if message_type == 'offer':
                await self.handle_offer(data)
            elif message_type == 'answer':
                await self.handle_answer(data)
            elif message_type == 'ice-candidate':
                await self.handle_ice_candidate(data)
            elif message_type == 'media-state':
                await self.handle_media_state(data)
            
        except json.JSONDecodeError as e:
            logger.error(f"JSON decode error: {e}")
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': 'Invalid JSON'
            }))
        except Exception as e:
            logger.error(f"Error in receive: {e}")

    async def handle_offer(self, data):
        """Handle WebRTC offer"""
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'webrtc_offer',
                'offer': data['offer'],
                'sender_id': self.scope["user"].id
            }
        )

    async def handle_answer(self, data):
        """Handle WebRTC answer"""
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'webrtc_answer',
                'answer': data['answer'],
                'sender_id': self.scope["user"].id
            }
        )

    async def handle_ice_candidate(self, data):
        """Handle ICE candidate"""
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'webrtc_ice_candidate',
                'candidate': data['candidate'],
                'sender_id': self.scope["user"].id
            }
        )

    async def handle_media_state(self, data):
        """Handle media state changes (video/audio on/off)"""
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'media_state_changed',
                'video_enabled': data.get('video_enabled'),
                'audio_enabled': data.get('audio_enabled'),
                'sender_id': self.scope["user"].id
            }
        )

    # Group message handlers
    async def webrtc_offer(self, event):
        """Send WebRTC offer to other peer"""
        if event['sender_id'] != self.scope["user"].id:
            await self.send(text_data=json.dumps({
                'type': 'offer',
                'offer': event['offer'],
                'sender_id': event['sender_id']
            }))

    async def webrtc_answer(self, event):
        """Send WebRTC answer to other peer"""
        if event['sender_id'] != self.scope["user"].id:
            await self.send(text_data=json.dumps({
                'type': 'answer',
                'answer': event['answer'],
                'sender_id': event['sender_id']
            }))

    async def webrtc_ice_candidate(self, event):
        """Send ICE candidate to other peer"""
        if event['sender_id'] != self.scope["user"].id:
            await self.send(text_data=json.dumps({
                'type': 'ice-candidate',
                'candidate': event['candidate'],
                'sender_id': event['sender_id']
            }))

    async def user_joined(self, event):
        """Notify when user joins"""
        if event['user_id'] != self.scope["user"].id:
            await self.send(text_data=json.dumps({
                'type': 'user-joined',
                'user_id': event['user_id'],
                'user_name': event['user_name']
            }))

    async def user_left(self, event):
        """Notify when user leaves"""
        if event['user_id'] != self.scope["user"].id:
            await self.send(text_data=json.dumps({
                'type': 'user-left',
                'user_id': event['user_id']
            }))

    async def media_state_changed(self, event):
        """Notify media state changes"""
        if event['sender_id'] != self.scope["user"].id:
            await self.send(text_data=json.dumps({
                'type': 'media-state-changed',
                'video_enabled': event['video_enabled'],
                'audio_enabled': event['audio_enabled'],
                'sender_id': event['sender_id']
            }))

    @database_sync_to_async
    def get_session(self, session_id):
        """Get session from database"""
        try:
            session = FocusBuddySession.objects.select_related('user1', 'user2').get(id=session_id)
            logger.info(f"Found session: {session.id}, user1: {session.user1}, user2: {session.user2}")
            return session
        except FocusBuddySession.DoesNotExist:
            logger.warning(f"Session {session_id} does not exist")
            return None
        except Exception as e:
            logger.error(f"Error getting session: {e}")
            return None