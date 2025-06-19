import { userAxios } from './axios'; // Update this import path

class WebRTCService {
    constructor() {
        this.peerConnections = new Map(); // Support multiple peer connections
        this.localStream = null;
        this.remoteStreams = new Map(); // Support multiple remote streams
        this.websocket = null;
        this.sessionId = null;
        this.userId = null;
        this.callbacks = {};
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectTimeout = null;
        
        // WebRTC configuration with fallback
        this.config = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' }
            ],
            iceCandidatePoolSize: 10
        };
    }

    // Event callbacks
    on(event, callback) {
        if (!this.callbacks[event]) {
            this.callbacks[event] = [];
        }
        this.callbacks[event].push(callback);
    }

    emit(event, ...args) {
        if (this.callbacks[event]) {
            this.callbacks[event].forEach(callback => {
                try {
                    callback(...args);
                } catch (error) {
                    console.error(`Error in callback for event ${event}:`, error);
                }
            });
        }
    }

    // Initialize WebRTC connection
    async initialize(sessionId, authToken = null) {
        try {
            this.sessionId = sessionId;
            
            // Store auth token if provided (for manual token passing)
            if (authToken) {
                this.authToken = authToken;
            }
            
            // Load configuration (non-blocking)
            this.loadConfig().catch(err => 
                console.warn('Config load failed, using defaults:', err)
            );
            
            // Get user media first
            await this.getUserMedia();
            
            // Connect to signaling server
            await this.connectWebSocket(sessionId, authToken);
            
            console.log('WebRTC initialized successfully');
            this.emit('connectionStateChange', 'initialized');
            return true;
        } catch (error) {
            console.error('Failed to initialize WebRTC:', error);
            this.emit('error', error);
            return false;
        }
    }

    // Load WebRTC configuration using userAxios
    async loadConfig() {
        try {
            const response = await userAxios.get('webrtc/config/', {
                // userAxios will handle authentication automatically
                // including CSRF tokens and token refresh if needed
            });
            
            const data = response.data;
            
            // Handle both formats: direct iceServers or nested under config
            const iceServers = data.iceServers || data.config?.iceServers;
            
            if (iceServers && Array.isArray(iceServers)) {
                this.config.iceServers = [...this.config.iceServers, ...iceServers];
            }
            
            console.log('WebRTC config loaded successfully');
        } catch (error) {
            // Enhanced error handling
            if (error.response?.status === 401) {
                console.warn('Authentication failed for WebRTC config, using defaults');
                this.emit('authenticationError', 'Failed to authenticate for WebRTC config');
            } else if (error.response?.status === 404) {
                console.warn('WebRTC config endpoint not found, using defaults');
            } else {
                console.warn('Failed to load WebRTC config, using defaults:', error.message);
            }
        }
    }

    // Connect to WebSocket signaling server
    async connectWebSocket(sessionId, authToken) {
        return new Promise((resolve, reject) => {
            try {
                const wsUrl = `ws://localhost:8000/ws/webrtc/${sessionId}/`;
                
                // Include credentials and cookies in WebSocket connection
                this.websocket = new WebSocket(wsUrl);
                
                // Add authorization header via cookie before connection
                document.cookie = `access=${authToken}; path=/`;
                
                this.websocket.onopen = () => {
                    console.log('WebSocket connected successfully');
                    resolve();
                };
                
                this.websocket.onclose = (event) => {
                    console.log('WebSocket closed:', event);
                    this.emit('connectionStateChange', 'disconnected');
                };
                
                this.websocket.onerror = (error) => {
                    console.error('WebSocket error:', error);
                    reject(error);
                };
                
            } catch (error) {
                console.error('Error connecting to WebSocket:', error);
                reject(error);
            }
        });
    }

    // Attempt reconnection
    attemptReconnection(sessionId, authToken) {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
        }

        this.reconnectAttempts++;
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
        
        console.log(`Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
        
        this.reconnectTimeout = setTimeout(async () => {
            try {
                await this.connectWebSocket(sessionId, authToken);
            } catch (error) {
                console.error('Reconnection failed:', error);
                if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                    this.emit('error', new Error('Max reconnection attempts reached'));
                }
            }
        }, delay);
    }

    // Get user media (camera and microphone)
    async getUserMedia(constraints = { video: true, audio: true }) {
        try {
            // Check if media devices are available
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                throw new Error('Media devices not supported');
            }

            this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
            console.log('Local stream obtained successfully');
            this.emit('localStream', this.localStream);
            return this.localStream;
        } catch (error) {
            console.error('Failed to get user media:', error);
            
            // Try with audio only if video fails
            if (constraints.video && error.name === 'NotFoundError') {
                try {
                    console.log('Retrying with audio only...');
                    return await this.getUserMedia({ video: false, audio: true });
                } catch (audioError) {
                    console.error('Audio-only fallback also failed:', audioError);
                }
            }
            
            throw error;
        }
    }

    // Create peer connection for a specific user
    createPeerConnection(userId) {
        if (this.peerConnections.has(userId)) {
            return this.peerConnections.get(userId);
        }

        const peerConnection = new RTCPeerConnection(this.config);

        // Add local stream tracks
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => {
                peerConnection.addTrack(track, this.localStream);
            });
        }

        // Handle remote stream
        peerConnection.ontrack = (event) => {
            console.log('Received remote stream from user:', userId);
            const remoteStream = event.streams[0];
            this.remoteStreams.set(userId, remoteStream);
            this.emit('remoteStream', userId, remoteStream);
        };

        // Handle ICE candidates
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                this.sendSignalingMessage({
                    type: 'ice-candidate',
                    candidate: event.candidate,
                    targetUserId: userId
                });
            }
        };

        // Handle connection state changes
        peerConnection.onconnectionstatechange = () => {
            console.log(`Connection state with ${userId}:`, peerConnection.connectionState);
            this.emit('peerConnectionStateChange', userId, peerConnection.connectionState);
            
            // Emit overall connection state
            const states = Array.from(this.peerConnections.values())
                .map(pc => pc.connectionState);
            
            if (states.includes('connected')) {
                this.emit('connectionStateChange', 'connected');
            } else if (states.includes('connecting')) {
                this.emit('connectionStateChange', 'connecting');
            } else {
                this.emit('connectionStateChange', 'disconnected');
            }
        };

        this.peerConnections.set(userId, peerConnection);
        return peerConnection;
    }

    // Handle signaling messages
    async handleSignalingMessage(message) {
        try {
            console.log('Received signaling message:', message.type);
            
            switch (message.type) {
                case 'user-joined':
                    this.emit('userJoined', {
                        id: message.user_id,
                        name: message.user_name
                    });
                    
                    // Create offer for the new user
                    if (message.user_id !== this.userId) {
                        await this.createOffer(message.user_id);
                    }
                    break;

                case 'user-left':
                    this.handleUserLeft(message.user_id);
                    break;

                case 'offer':
                    await this.handleOffer(message.offer, message.sender_id);
                    break;

                case 'answer':
                    await this.handleAnswer(message.answer, message.sender_id);
                    break;

                case 'ice-candidate':
                    await this.handleIceCandidate(message.candidate, message.sender_id);
                    break;

                case 'media-state-changed':
                    this.emit('peerMediaStateChanged', {
                        videoEnabled: message.video_enabled,
                        audioEnabled: message.audio_enabled,
                        senderId: message.sender_id
                    });
                    break;

                case 'authenticated':
                    this.userId = message.user_id;
                    console.log('Authenticated as user:', this.userId);
                    break;

                case 'error':
                    console.error('Signaling error:', message.error);
                    this.emit('error', new Error(message.error));
                    break;
            }
        } catch (error) {
            console.error('Error handling signaling message:', error);
        }
    }

    // Create and send offer
    async createOffer(targetUserId) {
        try {
            const peerConnection = this.createPeerConnection(targetUserId);
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);
            
            this.sendSignalingMessage({
                type: 'offer',
                offer: offer,
                targetUserId: targetUserId
            });
        } catch (error) {
            console.error('Error creating offer:', error);
        }
    }

    // Handle received offer
    async handleOffer(offer, senderId) {
        try {
            const peerConnection = this.createPeerConnection(senderId);
            await peerConnection.setRemoteDescription(offer);
            
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            
            this.sendSignalingMessage({
                type: 'answer',
                answer: answer,
                targetUserId: senderId
            });
        } catch (error) {
            console.error('Error handling offer:', error);
        }
    }

    // Handle received answer
    async handleAnswer(answer, senderId) {
        try {
            const peerConnection = this.peerConnections.get(senderId);
            if (peerConnection) {
                await peerConnection.setRemoteDescription(answer);
            }
        } catch (error) {
            console.error('Error handling answer:', error);
        }
    }

    // Handle ICE candidate
    async handleIceCandidate(candidate, senderId) {
        try {
            const peerConnection = this.peerConnections.get(senderId);
            if (peerConnection) {
                await peerConnection.addIceCandidate(candidate);
            }
        } catch (error) {
            console.error('Error handling ICE candidate:', error);
        }
    }

    // Handle user left
    handleUserLeft(userId) {
        console.log('User left:', userId);
        
        // Close peer connection
        const peerConnection = this.peerConnections.get(userId);
        if (peerConnection) {
            peerConnection.close();
            this.peerConnections.delete(userId);
        }
        
        // Remove remote stream
        this.remoteStreams.delete(userId);
        
        this.emit('userLeft', userId);
    }

    // Send signaling message
    sendSignalingMessage(message) {
        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            this.websocket.send(JSON.stringify(message));
        } else {
            console.warn('Cannot send message: WebSocket not connected');
        }
    }

    // Toggle video
    toggleVideo() {
        if (this.localStream) {
            const videoTrack = this.localStream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                this.sendMediaState();
                return videoTrack.enabled;
            }
        }
        return false;
    }

    // Toggle audio
    toggleAudio() {
        if (this.localStream) {
            const audioTrack = this.localStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                this.sendMediaState();
                return audioTrack.enabled;
            }
        }
        return false;
    }

    // Send media state to other peers
    sendMediaState() {
        const videoTrack = this.localStream?.getVideoTracks()[0];
        const audioTrack = this.localStream?.getAudioTracks()[0];
        
        this.sendSignalingMessage({
            type: 'media-state',
            video_enabled: videoTrack?.enabled || false,
            audio_enabled: audioTrack?.enabled || false
        });
    }

    // Get current media states
    getMediaStates() {
        const videoTrack = this.localStream?.getVideoTracks()[0];
        const audioTrack = this.localStream?.getAudioTracks()[0];
        
        return {
            video: videoTrack?.enabled || false,
            audio: audioTrack?.enabled || false
        };
    }

    // Get connection statistics
    async getConnectionStats() {
        const stats = {};
        
        for (const [userId, peerConnection] of this.peerConnections) {
            try {
                const rtcStats = await peerConnection.getStats();
                stats[userId] = {
                    connectionState: peerConnection.connectionState,
                    iceConnectionState: peerConnection.iceConnectionState,
                    stats: rtcStats
                };
            } catch (error) {
                console.error(`Error getting stats for user ${userId}:`, error);
            }
        }
        
        return stats;
    }

    // Additional method to manually set auth token if needed
    setAuthToken(token) {
        this.authToken = token;
    }

    // Method to refresh WebRTC config (useful after token refresh)
    async refreshConfig() {
        try {
            await this.loadConfig();
            console.log('WebRTC config refreshed successfully');
        } catch (error) {
            console.error('Failed to refresh WebRTC config:', error);
        }
    }

    // Cleanup
    cleanup() {
        console.log('Cleaning up WebRTC service...');
        
        // Clear reconnection timeout
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }

        // Stop local stream
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => {
                track.stop();
                console.log('Stopped track:', track.kind);
            });
            this.localStream = null;
        }

        // Close all peer connections
        this.peerConnections.forEach((peerConnection, userId) => {
            console.log('Closing peer connection for user:', userId);
            peerConnection.close();
        });
        this.peerConnections.clear();

        // Clear remote streams
        this.remoteStreams.clear();

        // Close WebSocket
        if (this.websocket) {
            this.websocket.close(1000, 'Client cleanup');
            this.websocket = null;
        }

        // Clear callbacks
        this.callbacks = {};
        
        // Reset properties
        this.sessionId = null;
        this.userId = null;
        this.authToken = null;
        this.reconnectAttempts = 0;
        
        console.log('WebRTC service cleanup completed');
    }
}

export default WebRTCService;