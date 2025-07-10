import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from asgiref.sync import sync_to_async
from userapp.models import FocusBuddyParticipant

logger = logging.getLogger(__name__)

active_participants = {}  # { session_id: set(user_id) }

class WebRTCConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.session_id = self.scope['url_route']['kwargs']['session_id']
        self.room_group_name = f'webrtc_session_{self.session_id}'
        self.user_group_name = f'user_{self.scope["user"].id}'  # User-specific group
        self.user = self.scope['user']

        logger.info(f"[WebSocket] Connection attempt for session {self.session_id}")
        logger.info(f"[WebSocket] User from scope: {self.user}")
        logger.info(f"[WebSocket] User type: {type(self.user)}")
        logger.info(f"[WebSocket] Is anonymous: {self.user.is_anonymous}")
        
        if hasattr(self.user, 'id'):
            logger.info(f"[WebSocket] User ID: {self.user.id}")
        if hasattr(self.user, 'username'):
            logger.info(f"[WebSocket] Username: {self.user.username}")

        if self.user.is_anonymous:
            logger.warning("[WebSocket] Anonymous user rejected - closing connection")
            await self.close(code=4001)
            return

        # Host admit logic: Only allow approved participants
        try:
            # Only check for non-hosts (host is always allowed)
            from userapp.models import FocusBuddySession
            session = await sync_to_async(FocusBuddySession.objects.get)(id=self.session_id)
            if session.creator_id_id != self.user.id:
                try:
                    participant = await sync_to_async(FocusBuddyParticipant.objects.get)(session_id=self.session_id, user_id=self.user.id)
                    if participant.status == 'pending':
                        await self.accept()
                        # Add user to their specific group for admission notifications
                        await self.channel_layer.group_add(self.user_group_name, self.channel_name)
                        print(f"WebSocket: Added user {self.user.id} to group {self.user_group_name} (pending)")
                        await self.send(text_data=json.dumps({
                            'type': 'admission-status',
                            'status': 'pending',
                            'message': 'Waiting for host approval.'
                        }))
                        return
                    elif participant.status == 'rejected':
                        await self.accept()
                        await self.send(text_data=json.dumps({
                            'type': 'admission-status',
                            'status': 'rejected',
                            'message': 'Your join request was rejected by the host.'
                        }))
                        await self.close(code=4003)
                        return
                    elif participant.status != 'approved':
                        await self.accept()
                        await self.send(text_data=json.dumps({
                            'type': 'admission-status',
                            'status': participant.status,
                            'message': 'You are not approved to join this session.'
                        }))
                        await self.close(code=4004)
                        return
                except FocusBuddyParticipant.DoesNotExist:
                    await self.accept()
                    await self.send(text_data=json.dumps({
                        'type': 'admission-status',
                        'status': 'not-registered',
                        'message': 'You are not registered as a participant.'
                    }))
                    await self.close(code=4005)
                    return
            # If host or approved participant, proceed as before
            await self.accept()
            await self.channel_layer.group_add(self.room_group_name, self.channel_name)
            # Also add user to their specific group for admission notifications
            await self.channel_layer.group_add(self.user_group_name, self.channel_name)
            print(f"WebSocket: Added user {self.user.id} to group {self.user_group_name} (approved/host)")

            if self.session_id not in active_participants:
                active_participants[self.session_id] = set()

            other_users = list(active_participants[self.session_id])
            active_participants[self.session_id].add(self.user.id)

            await self.send(text_data=json.dumps({
                'type': 'authenticated',
                'user_id': self.user.id,
                'username': self.user.username
            }))

            await self.send(text_data=json.dumps({
                'type': 'existing-users',
                'users': other_users
            }))

            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'user_joined',
                    'user_id': self.user.id,
                    'user_name': self.user.username
                }
            )

        except Exception as e:
            logger.error(f"[WebSocket] Error during connection setup: {e}")
            await self.close(code=4000)

    async def disconnect(self, close_code):
        try:
            await self.channel_layer.group_discard(self.room_group_name, self.channel_name)
            # Also remove from user-specific group
            if hasattr(self, 'user_group_name'):
                await self.channel_layer.group_discard(self.user_group_name, self.channel_name)

            if self.session_id in active_participants:
                active_participants[self.session_id].discard(self.user.id)
                if not active_participants[self.session_id]:
                    del active_participants[self.session_id]

                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'user_left',
                        'user_id': self.user.id
                    }
                )

        except Exception as e:
            logger.error(f"[WebSocket] Error during disconnect: {e}")

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            msg_type = data.get('type')

            handler_map = {
                'offer': self.handle_offer,
                'answer': self.handle_answer,
                'ice-candidate': self.handle_ice_candidate,
                'media-state': self.handle_media_state,
                'chat-message': self.handle_chat_message,  # This is correct
            }

            if msg_type in handler_map:
                await handler_map[msg_type](data)
            else:
                logger.warning(f"[WebSocket] Unknown message type: {msg_type}")

        except json.JSONDecodeError as e:
            logger.error(f"[WebSocket] JSON decode error: {e}")
        except Exception as e:
            logger.error(f"[WebSocket] Receive error: {e}")

    # ---------- WebRTC Handlers ----------
    async def handle_offer(self, data):
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'webrtc_offer',
                'offer': data['offer'],
                'sender_id': self.user.id,
                'target_id': data['target_id']
            }
        )

    async def handle_answer(self, data):
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'webrtc_answer',
                'answer': data['answer'],
                'sender_id': self.user.id,
                'target_id': data['target_id']
            }
        )

    async def handle_ice_candidate(self, data):
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'webrtc_ice_candidate',
                'candidate': data['candidate'],
                'sender_id': self.user.id,
                'target_id': data['target_id']
            }
        )

    async def handle_media_state(self, data):
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'media_state_changed',
                'video_enabled': data.get('video_enabled'),
                'audio_enabled': data.get('audio_enabled'),
                'sender_id': self.user.id
            }
        )

    # ---------- Chat Handler ----------
    async def handle_chat_message(self, data):
        message = data.get('message')
        if message:
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'chat_message',
                    'message': message,
                    'sender_id': self.user.id,
                    'sender_name': self.user.username
                }
            )

    # ---------- Host Notification Handler ----------
    async def notify_host_new_request(self, event):
        """Send notification to host about new join request"""
        await self.send(text_data=json.dumps({
            'type': 'new_join_request',
            'participant_id': event['participant_id'],
            'user_name': event['user_name'],
            'user_id': event['user_id']
        }))

    async def notify_host_request_updated(self, event):
        """Send notification to host about updated join request status"""
        await self.send(text_data=json.dumps({
            'type': 'join_request_updated',
            'participant_id': event['participant_id'],
            'user_name': event['user_name'],
            'status': event['status']
        }))

    # ---------- Participant Admission Status Handler ----------
    async def notify_participant_admission_status(self, event):
        print(f"WebSocket: notify_participant_admission_status called for user {self.user.id} with event: {event}")
        await self.send(text_data=json.dumps({
            'type': 'admission-status',
            'status': event['status'],
            'message': event['message'],
            'session_id': event['session_id']
        }))

    # ---------- WebRTC Message Handlers ----------
    async def webrtc_offer(self, event):
        if event['target_id'] == self.user.id:
            await self.send(text_data=json.dumps({
                'type': 'offer',
                'offer': event['offer'],
                'sender_id': event['sender_id']
            }))

    async def webrtc_answer(self, event):
        if event['target_id'] == self.user.id:
            await self.send(text_data=json.dumps({
                'type': 'answer',
                'answer': event['answer'],
                'sender_id': event['sender_id']
            }))

    async def webrtc_ice_candidate(self, event):
        if event['target_id'] == self.user.id:
            await self.send(text_data=json.dumps({
                'type': 'ice-candidate',
                'candidate': event['candidate'],
                'sender_id': event['sender_id']
            }))

    async def user_joined(self, event):
        if event['user_id'] != self.user.id:
            await self.send(text_data=json.dumps({
                'type': 'user-joined',
                'user_id': event['user_id'],
                'user_name': event['user_name']
            }))

    async def user_left(self, event):
        await self.send(text_data=json.dumps({
            'type': 'user-left',
            'user_id': event['user_id']
        }))

    async def media_state_changed(self, event):
        if event['sender_id'] != self.user.id:
            await self.send(text_data=json.dumps({
                'type': 'media-state-changed',
                'video_enabled': event['video_enabled'],
                'audio_enabled': event['audio_enabled'],
                'sender_id': event['sender_id']
            }))

    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            'type': 'chat-message',
            'sender_id': event['sender_id'],
            'sender_name': event['sender_name'],
            'message': event['message']
        }))


class MentorNotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        user = self.scope["user"]
        is_authenticated = user.is_authenticated
        has_mentor_profile = False
        if is_authenticated:
            from userapp.models import Mentor
            has_mentor_profile = await sync_to_async(Mentor.objects.filter(user_id=user.id).exists)()
        if is_authenticated and has_mentor_profile:
            self.group_name = f"mentor_notify_{user.id}"
            await self.channel_layer.group_add(self.group_name, self.channel_name)
            await self.accept()
        else:
            await self.close()

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data):
        # Not needed for notifications
        pass

    async def send_notification(self, event):
        await self.send(text_data=json.dumps(event["content"]))
  
