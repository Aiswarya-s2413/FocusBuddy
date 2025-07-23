import { userAxios } from './axios';

class WebRTCService {
    constructor() {
        this.peerConnections = new Map();
        this.localStream = null;
        this.remoteStreams = new Map();
        this.websocket = null;
        this.sessionId = null;
        this.userId = null;
        this.callbacks = {};
        this.authToken = null;
        
        // Add state tracking for peer connections
        this.peerConnectionStates = new Map();
        this.pendingCandidates = new Map();

        this.config = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' }
            ],
            iceCandidatePoolSize: 10
        };
    }

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

    async initialize(sessionId, authToken = null, callType = 'group') {
        try {
            this.sessionId = sessionId;
            this.callType = callType;

            // Enhanced cookie debugging and token handling
            console.log('=== Cookie Debug Info ===');
            console.log('Current domain:', window.location.hostname);
            console.log('Current path:', window.location.pathname);
            console.log('Current protocol:', window.location.protocol);
            console.log('All cookies before token set:', document.cookie);

            // Set auth token from argument or cookie
            if (authToken) {
                this.authToken = authToken;
                this.setCookie('access', authToken);
                console.log('Auth token set via argument:', authToken);
            } else {
                const tokenFromCookie =
                    this.getCookie('access') ||
                    this.getCookie('mentor_access') || 
                    this.getCookie('access_token') || 
                    this.getCookie('authToken');
                this.authToken = tokenFromCookie;
                console.log('Auth token fetched from cookie:', tokenFromCookie);
            }

            console.log('All cookies after token handling:', document.cookie);
            console.log('Final auth token:', this.authToken);
            console.log('=== End Cookie Debug ===');

            await this.loadConfig();
            await this.getUserMedia();
            await this.connectWebSocket(sessionId);

            console.log('WebRTC initialized successfully');
            this.emit('connectionStateChange', 'initialized');
            return true;
        } catch (error) {
            console.error('Failed to initialize WebRTC:', error);
            this.emit('error', error);
            return false;
        }
    }

    // Enhanced cookie getter with better parsing
    getCookie(name) {
        console.log(`Getting cookie: ${name}`);
        console.log('Raw document.cookie:', document.cookie);
        
        if (!document.cookie) {
            console.log('No cookies found');
            return null;
        }

        // Method 1: Original approach
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        console.log('Cookie parts:', parts);
        
        if (parts.length === 2) {
            const cookieValue = parts.pop().split(';').shift();
            console.log(`Cookie ${name} found (method 1):`, cookieValue);
            return cookieValue;
        }

        // Method 2: Alternative approach using regex
        const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
        if (match) {
            const cookieValue = match[2];
            console.log(`Cookie ${name} found (method 2):`, cookieValue);
            return cookieValue;
        }

        // Method 3: Manual parsing
        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            const [cookieName, cookieValue] = cookie.trim().split('=');
            if (cookieName === name) {
                console.log(`Cookie ${name} found (method 3):`, cookieValue);
                return cookieValue;
            }
        }

        console.log(`Cookie ${name} not found`);
        return null;
    }

    // Enhanced cookie setter with better options
    setCookie(name, value, options = {}) {
        console.log(`Setting cookie: ${name} = ${value}`);
        
        const defaultOptions = {
            path: '/',
            secure: window.location.protocol === 'https:',
            sameSite: 'Lax',
            ...options
        };

        let cookieString = `${name}=${value}`;
        
        if (defaultOptions.path) {
            cookieString += `; path=${defaultOptions.path}`;
        }
        
        if (defaultOptions.domain) {
            cookieString += `; domain=${defaultOptions.domain}`;
        }
        
        if (defaultOptions.secure) {
            cookieString += '; secure';
        }
        
        if (defaultOptions.sameSite) {
            cookieString += `; samesite=${defaultOptions.sameSite}`;
        }
        
        if (defaultOptions.maxAge) {
            cookieString += `; max-age=${defaultOptions.maxAge}`;
        }

        console.log('Setting cookie string:', cookieString);
        document.cookie = cookieString;
        
        // Verify cookie was set
        setTimeout(() => {
            const verifyValue = this.getCookie(name);
            console.log(`Cookie verification - ${name}:`, verifyValue);
        }, 100);
    }

    // Alternative method to get token from various sources
    getAuthToken() {
        console.log('Getting auth token from multiple sources...');
        
        // Try cookie first
        let token = this.getCookie('access');
        if (token) {
            console.log('Token found in cookie:', token);
            return token;
        }

        // Try different cookie names
        const cookieNames = ['access', 'mentor_access', 'accessToken', 'access_token', 'token', 'authToken'];
        for (const cookieName of cookieNames) {
            token = this.getCookie(cookieName);
            if (token) {
                console.log(`Token found in cookie ${cookieName}:`, token);
                return token;
            }
        }

        console.log('No token found in any storage');
        return null;
    }

    async loadConfig() {
        try {
            const response = await userAxios.get('webrtc/config/');
            const data = response.data;
            const iceServers = data.iceServers || data.config?.iceServers;
            if (iceServers && Array.isArray(iceServers)) {
                this.config.iceServers = [...this.config.iceServers, ...iceServers];
            }
            console.log('WebRTC config loaded successfully');
        } catch (error) {
            console.warn('Failed to load WebRTC config:', error);
        }
    }

    async connectWebSocket(sessionId) {
        return new Promise((resolve, reject) => {
            try {
                // Use the enhanced token getter
                if (!this.authToken) {
                    this.authToken = this.getAuthToken();
                }

                console.log('=== WebSocket Connection Debug ===');
                console.log('Session ID:', sessionId);
                console.log('Auth token available:', !!this.authToken);
                console.log('Auth token length:', this.authToken?.length || 0);
                
                // Use mentor session URL if callType is 'mentor', else default
                let wsUrl;
                if (this.callType === 'mentor') {
                    wsUrl = `wss://api.focusbuddy.aiswaryasathyan.space/ws/mentor-session/${sessionId}/`;
                } else {
                    wsUrl = `wss://api.focusbuddy.aiswaryasathyan.space/ws/webrtc/${sessionId}/`;
                }
                if (window.location.protocol === 'https:') {
                    if (this.callType === 'mentor') {
                        wsUrl = `wss://api.focusbuddy.aiswaryasathyan.space/ws/mentor-session/${sessionId}/`;
                    } else {
                        wsUrl = `wss://api.focusbuddy.aiswaryasathyan.space/ws/webrtc/${sessionId}/`;
                    }
                }

                console.log('WebSocket URL:', wsUrl);
                console.log('Current location:', window.location.href);
                console.log('Protocol:', window.location.protocol);

                // Make sure access token is set as cookie before WebSocket starts
                if (this.authToken) {
                    this.setCookie('access', this.authToken);
                    console.log('Cookie set before WebSocket connection');
                }

                // Add connection timeout
                const connectionTimeout = setTimeout(() => {
                    console.error('WebSocket connection timeout');
                    this.websocket?.close();
                    reject(new Error('WebSocket connection timeout'));
                }, 10000); // 10 second timeout

                this.websocket = new WebSocket(wsUrl);

                this.websocket.onopen = () => {
                    clearTimeout(connectionTimeout);
                    console.log('WebSocket connected successfully');
                    console.log('WebSocket readyState:', this.websocket.readyState);
                    resolve();
                };

                this.websocket.onmessage = (event) => {
                    console.log('WebSocket message received:', event.data);
                    try {
                        const data = JSON.parse(event.data);
                        this.handleSignalingMessage(data);
                    } catch (parseError) {
                        console.error('Failed to parse WebSocket message:', parseError);
                    }
                };

                this.websocket.onclose = (event) => {
                    clearTimeout(connectionTimeout);
                    console.warn('WebSocket closed:', {
                        code: event.code,
                        reason: event.reason,
                        wasClean: event.wasClean
                    });
                    
                    // Common WebSocket close codes
                    const closeCodes = {
                        1000: 'Normal closure',
                        1001: 'Going away',
                        1002: 'Protocol error',
                        1003: 'Unsupported data',
                        1006: 'Abnormal closure',
                        1007: 'Invalid frame payload data',
                        1008: 'Policy violation',
                        1009: 'Message too big',
                        1011: 'Internal server error',
                        1015: 'TLS handshake failure'
                    };
                    
                    console.warn('Close code meaning:', closeCodes[event.code] || 'Unknown');
                    this.emit('connectionStateChange', 'disconnected');
                };

                this.websocket.onerror = (error) => {
                    clearTimeout(connectionTimeout);
                    console.error('WebSocket error details:', {
                        error,
                        readyState: this.websocket?.readyState,
                        url: wsUrl,
                        timestamp: new Date().toISOString()
                    });
                    
                    // Try to provide more helpful error information
                    console.error('Possible causes:');
                    console.error('1. WebSocket server not running on localhost:8000');
                    console.error('2. Authentication failure on server side');
                    console.error('3. CORS policy blocking WebSocket connection');
                    console.error('4. Server rejecting connection due to invalid token');
                    console.error('5. Network connectivity issues');
                    
                    reject(error);
                };

                console.log('WebSocket connection initiated...');
                console.log('=== End WebSocket Debug ===');
                
            } catch (error) {
                console.error('Error connecting to WebSocket:', error);
                reject(error);
            }
        });
    }

    async getUserMedia(constraints = { video: true, audio: true }) {
        try {
            if (!navigator.mediaDevices?.getUserMedia) {
                throw new Error('Media devices not supported');
            }

            this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
            this.emit('localStream', this.localStream);
            return this.localStream;
        } catch (error) {
            console.error('Failed to get user media:', error);
            if (constraints.video && error.name === 'NotFoundError') {
                return await this.getUserMedia({ video: false, audio: true });
            }
            throw error;
        }
    }

    createPeerConnection(userId) {
        if (this.peerConnections.has(userId)) {
            return this.peerConnections.get(userId);
        }

        const peerConnection = new RTCPeerConnection(this.config);
        console.log(`[WebRTC] Creating peer connection for user ${userId}`);
        
        // Initialize state tracking
        this.peerConnectionStates.set(userId, {
            signalingState: 'stable',
            hasSetLocalDescription: false,
            hasSetRemoteDescription: false,
            isInitiator: false
        });
        
        // Initialize pending candidates array
        this.pendingCandidates.set(userId, []);

        if (this.localStream) {
            console.log(`[WebRTC] Adding local tracks to peer connection for user ${userId}`);
            this.localStream.getTracks().forEach(track => {
                peerConnection.addTrack(track, this.localStream);
                console.log(`[WebRTC] Added track (${track.kind}) to user ${userId}`);
            });
        } else {
            console.warn(`[WebRTC] No local stream available when creating peer connection for user ${userId}`);
        }

        peerConnection.ontrack = (event) => {
            const remoteStream = event.streams[0];
            this.remoteStreams.set(userId, remoteStream);
            this.emit('remoteStream', userId, remoteStream);
        };

        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                this.sendSignalingMessage({
                    type: 'ice-candidate',
                    candidate: event.candidate,
                    target_id: userId
                });
            }
        };

        peerConnection.onconnectionstatechange = () => {
            this.emit('peerConnectionStateChange', userId, peerConnection.connectionState);
            const states = Array.from(this.peerConnections.values()).map(pc => pc.connectionState);
            this.emit('connectionStateChange', states.includes('connected') ? 'connected' : 'disconnected');
        };

        // Track signaling state changes
        peerConnection.onsignalingstatechange = () => {
            console.log(`Peer ${userId} signaling state changed to:`, peerConnection.signalingState);
            const state = this.peerConnectionStates.get(userId);
            if (state) {
                state.signalingState = peerConnection.signalingState;
            }
        };

        this.peerConnections.set(userId, peerConnection);
        return peerConnection;
    }

    async handleSignalingMessage(message) {
        try {
            switch (message.type) {
                case 'authenticated':
                    console.log('Authenticated as user:', message.user_id);
                    this.userId = message.user_id;
                    break;
                case 'admission-status':
                    // Handle admission status updates
                    console.log('Received admission status:', message.status, message.message);
                    this.emit('admissionStatus', message.status, message.message, message.session_id);
                    
                    if (message.status === 'approved') {
                        // Participant was approved - they can now join the call
                        console.log('Participant approved - initializing WebRTC connection');
                        // The frontend should handle this by reconnecting to the session
                        this.emit('admissionApproved', message.session_id);
                    } else if (message.status === 'rejected') {
                        // Participant was rejected - show error and cleanup
                        console.log('Participant rejected - cleaning up');
                        this.emit('admissionRejected', message.message);
                        this.cleanup();
                    } else if (message.status === 'pending') {
                        // Still pending - just show status
                        console.log('Participant still pending approval');
                    } else {
                        // Other status - cleanup
                        this.cleanup();
                    }
                    break;
                case 'new_join_request':
                    // Handle new join request notification (for hosts)
                    this.emit('newJoinRequest', {
                        participant_id: message.participant_id,
                        user_name: message.user_name,
                        user_id: message.user_id
                    });
                    break;
                case 'join_request_updated':
                    // Handle join request status update (for hosts)
                    this.emit('joinRequestUpdated', {
                        participant_id: message.participant_id,
                        user_name: message.user_name,
                        status: message.status
                    });
                    break;
                case 'existing-users':
                    console.log('Existing users:', message.users);
                    this.existingUsers = message.users;
                    break;
                    
                        case 'user-joined':
                            console.log('User joined:', message);
                            this.emit('userJoined', { id: message.user_id, name: message.user_name });
                        
                            if (this.callType === '1on1') {
                                // Prevent duplicate offer creation in one-on-one
                                if (!this.peerConnections.has(message.user_id) && message.user_id !== this.userId) {
                                    await this.createOffer(message.user_id);
                                }
                            } else {
                                if (message.user_id !== this.userId) {
                                    await this.createOffer(message.user_id);
                                }
                            }
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
                case 'user-left':
                    this.handleUserLeft(message.user_id);
                    break;
                case 'chat-message':
                    this.emit('chatMessage', {
                        sender_id: message.sender_id,
                        sender_name: message.sender_name,
                        message: message.message
                    });
                    break;
                default:
                    console.warn('Unknown message type:', message.type);
            }
        } catch (error) {
            console.error('Error handling signaling message:', error);
        }
    }

    async createOffer(userId) {
        try {
            const peerConnection = this.createPeerConnection(userId);
            const state = this.peerConnectionStates.get(userId);
            
            // Mark as initiator
            state.isInitiator = true;
            
            console.log(`Creating offer for user ${userId}, current state:`, peerConnection.signalingState);
            
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);
            
            state.hasSetLocalDescription = true;
            console.log(`Set local description for user ${userId}, new state:`, peerConnection.signalingState);
            
            this.sendSignalingMessage({
                type: 'offer',
                offer,
                target_id: userId
            });
        } catch (error) {
            console.error(`Error creating offer for user ${userId}:`, error);
            throw error;
        }
    }

    async handleOffer(offer, senderId) {
        try {
            const peerConnection = this.createPeerConnection(senderId);
            const state = this.peerConnectionStates.get(senderId);
            
            console.log(`Handling offer from user ${senderId}, current state:`, peerConnection.signalingState);
            
            // Check if we can set remote description
            if (peerConnection.signalingState !== 'stable' && peerConnection.signalingState !== 'have-local-offer') {
                console.warn(`Cannot handle offer from ${senderId}, peer connection is in state: ${peerConnection.signalingState}`);
                return;
            }
            
            // If we already have a local offer and this is from a higher user ID, ignore it to avoid race condition
            if (state.hasSetLocalDescription && senderId > this.userId) {
                console.log(`Ignoring offer from ${senderId} due to race condition (we are initiator)`);
                return;
            }
            
            await peerConnection.setRemoteDescription(offer);
            state.hasSetRemoteDescription = true;
            console.log(`Set remote description for user ${senderId}, new state:`, peerConnection.signalingState);
            
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            
            state.hasSetLocalDescription = true;
            console.log(`Set local answer for user ${senderId}, final state:`, peerConnection.signalingState);
            
            this.sendSignalingMessage({
                type: 'answer',
                answer,
                target_id: senderId
            });
            
            // Process any pending ICE candidates
            await this.processPendingCandidates(senderId);
            
        } catch (error) {
            console.error(`Error handling offer from user ${senderId}:`, error);
            throw error;
        }
    }

    async handleAnswer(answer, senderId) {
        try {
            const peerConnection = this.peerConnections.get(senderId);
            const state = this.peerConnectionStates.get(senderId);
            
            if (!peerConnection) {
                console.warn(`No peer connection found for user ${senderId}`);
                return;
            }
            
            console.log(`Handling answer from user ${senderId}, current state:`, peerConnection.signalingState);
            
            // Check if we can set remote description
            if (peerConnection.signalingState !== 'have-local-offer') {
                console.warn(`Cannot handle answer from ${senderId}, peer connection is in state: ${peerConnection.signalingState}`);
                return;
            }
            
            await peerConnection.setRemoteDescription(answer);
            state.hasSetRemoteDescription = true;
            console.log(`Set remote answer for user ${senderId}, new state:`, peerConnection.signalingState);
            
            // Process any pending ICE candidates
            await this.processPendingCandidates(senderId);
            
        } catch (error) {
            console.error(`Error handling answer from user ${senderId}:`, error);
            throw error;
        }
    }

    async handleIceCandidate(candidate, senderId) {
        try {
            const peerConnection = this.peerConnections.get(senderId);
            const state = this.peerConnectionStates.get(senderId);
            
            if (!peerConnection) {
                console.warn(`No peer connection found for user ${senderId}`);
                return;
            }
            
            // If remote description is not set yet, queue the candidate
            if (!state.hasSetRemoteDescription) {
                console.log(`Queueing ICE candidate for user ${senderId} (remote description not set yet)`);
                this.pendingCandidates.get(senderId).push(candidate);
                return;
            }
            
            console.log(`Adding ICE candidate for user ${senderId}`);
            await peerConnection.addIceCandidate(candidate);
            
        } catch (error) {
            console.error(`Error handling ICE candidate from user ${senderId}:`, error);
            // Don't throw error for ICE candidate failures as they're not critical
        }
    }

    async processPendingCandidates(userId) {
        const peerConnection = this.peerConnections.get(userId);
        const pendingCandidates = this.pendingCandidates.get(userId) || [];
        
        if (pendingCandidates.length === 0) {
            return;
        }
        
        console.log(`Processing ${pendingCandidates.length} pending ICE candidates for user ${userId}`);
        
        for (const candidate of pendingCandidates) {
            try {
                await peerConnection.addIceCandidate(candidate);
            } catch (error) {
                console.error(`Error adding pending ICE candidate for user ${userId}:`, error);
            }
        }
        
        // Clear pending candidates
        this.pendingCandidates.set(userId, []);
    }

    handleUserLeft(userId) {
        const pc = this.peerConnections.get(userId);
        if (pc) pc.close();
        this.peerConnections.delete(userId);
        this.peerConnectionStates.delete(userId);
        this.pendingCandidates.delete(userId);
        this.remoteStreams.delete(userId);
        this.emit('userLeft', userId);
    }

    sendSignalingMessage(message) {
        if (this.websocket?.readyState === WebSocket.OPEN) {
            console.log('Sending message:', message);
            this.websocket.send(JSON.stringify(message));
        } else {
            console.warn('Cannot send message, WebSocket not connected');
        }
    }

    toggleVideo() {
        const videoTrack = this.localStream?.getVideoTracks()[0];
        if (videoTrack) {
            videoTrack.enabled = !videoTrack.enabled;
            this.sendMediaState();
            return videoTrack.enabled;
        }
        return false;
    }

    toggleAudio() {
        const audioTrack = this.localStream?.getAudioTracks()[0];
        if (audioTrack) {
            audioTrack.enabled = !audioTrack.enabled;
            this.sendMediaState();
            return audioTrack.enabled;
        }
        return false;
    }

    sendChatMessage(message) {
        if (this.websocket?.readyState === WebSocket.OPEN) {
            this.sendSignalingMessage({
                type: 'chat-message',
                message: message
            });
        } else {
            console.warn('Cannot send chat message, WebSocket not connected');
        }
    }

    sendMediaState() {
        const videoTrack = this.localStream?.getVideoTracks()[0];
        const audioTrack = this.localStream?.getAudioTracks()[0];
        this.sendSignalingMessage({
            type: 'media-state',
            video_enabled: videoTrack?.enabled || false,
            audio_enabled: audioTrack?.enabled || false
        });
    }

    // Test WebSocket server connectivity
    async testWebSocketConnection(sessionId) {
        return new Promise((resolve) => {
            const testUrls = [
                `wss://api.focusbuddy.aiswaryasathyan.space/ws/webrtc/${sessionId}/`,
                `wss://api.focusbuddy.aiswaryasathyan.space/ws/webrtc/${sessionId}/`,
                `wss://api.focusbuddy.aiswaryasathyan.space/ws/webrtc/${sessionId}/`,
            ];

            console.log('=== Testing WebSocket URLs ===');
            
            const testResults = [];
            let completedTests = 0;

            testUrls.forEach((url, index) => {
                const testWs = new WebSocket(url);
                const timeout = setTimeout(() => {
                    testWs.close();
                    testResults[index] = { url, status: 'timeout', error: 'Connection timeout' };
                    completedTests++;
                    if (completedTests === testUrls.length) {
                        console.log('WebSocket test results:', testResults);
                        resolve(testResults);
                    }
                }, 3000);

                testWs.onopen = () => {
                    clearTimeout(timeout);
                    testResults[index] = { url, status: 'success', error: null };
                    testWs.close();
                    completedTests++;
                    if (completedTests === testUrls.length) {
                        console.log('WebSocket test results:', testResults);
                        resolve(testResults);
                    }
                };

                testWs.onerror = (error) => {
                    clearTimeout(timeout);
                    testResults[index] = { url, status: 'error', error: error.message || 'Connection failed' };
                    completedTests++;
                    if (completedTests === testUrls.length) {
                        console.log('WebSocket test results:', testResults);
                        resolve(testResults);
                    }
                };
            });
        });
    }
 

    cleanup() {
        console.log("Cleanup called")
        this.localStream?.getTracks().forEach(track => track.stop());
        this.localStream = null;
        this.peerConnections.forEach(pc => pc.close());
        this.peerConnections.clear();
        this.peerConnectionStates.clear();
        this.pendingCandidates.clear();
        this.remoteStreams.clear();
        this.websocket?.close();
        this.websocket = null;
        this.sessionId = null;
        this.userId = null;
        this.authToken = null;
        this.callbacks = {};
    }
}

export default WebRTCService;