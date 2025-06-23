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

    async initialize(sessionId, authToken = null) {
        try {
            this.sessionId = sessionId;

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
                const tokenFromCookie = this.getCookie('access');
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
        const cookieNames = ['access', 'accessToken', 'access_token', 'token', 'authToken'];
        for (const cookieName of cookieNames) {
            token = this.getCookie(cookieName);
            if (token) {
                console.log(`Token found in cookie ${cookieName}:`, token);
                return token;
            }
        }

        // Try localStorage
        try {
            token = localStorage.getItem('access') || localStorage.getItem('accessToken') || localStorage.getItem('token');
            if (token) {
                console.log('Token found in localStorage:', token);
                return token;
            }
        } catch (e) {
            console.log('localStorage not available');
        }

        // Try sessionStorage
        try {
            token = sessionStorage.getItem('access') || sessionStorage.getItem('accessToken') || sessionStorage.getItem('token');
            if (token) {
                console.log('Token found in sessionStorage:', token);
                return token;
            }
        } catch (e) {
            console.log('sessionStorage not available');
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
                
                // Try different WebSocket URL formats
                const wsUrls = [
                    `ws://localhost:8000/ws/webrtc/${sessionId}/`,
                    `ws://localhost:8000/ws/webrtc/${sessionId}/?token=${this.authToken}`,
                    `wss://localhost:8000/ws/webrtc/${sessionId}/`,
                ];

                let wsUrl = wsUrls[0]; // Start with the basic URL
                
                // If running on HTTPS, try WSS first
                if (window.location.protocol === 'https:') {
                    wsUrl = `wss://localhost:8000/ws/webrtc/${sessionId}/`;
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
                    
                    // Send initial authentication if needed
                    if (this.authToken) {
                        this.sendSignalingMessage({
                            type: 'authenticate',
                            token: this.authToken
                        });
                    }
                    
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

        if (this.localStream) {
            this.localStream.getTracks().forEach(track => {
                peerConnection.addTrack(track, this.localStream);
            });
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
                case 'existing-users':
                    console.log('Existing users in session:', message.users);
                    for (const id of message.users) {
                        if (id !== this.userId) {
                            await this.createOffer(id);
                        }
                    }
                    break;
                case 'user-joined':
                    console.log('User joined:', message);
                    this.emit('userJoined', { id: message.user_id, name: message.user_name });
                    if (message.user_id !== this.userId) await this.createOffer(message.user_id);
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
                default:
                    console.warn('Unknown message type:', message.type);
            }
        } catch (error) {
            console.error('Error handling signaling message:', error);
        }
    }

    async createOffer(userId) {
        const peerConnection = this.createPeerConnection(userId);
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        this.sendSignalingMessage({
            type: 'offer',
            offer,
            target_id: userId
        });
    }

    async handleOffer(offer, senderId) {
        const peerConnection = this.createPeerConnection(senderId);
        await peerConnection.setRemoteDescription(offer);
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        this.sendSignalingMessage({
            type: 'answer',
            answer,
            target_id: senderId
        });
    }

    async handleAnswer(answer, senderId) {
        const peerConnection = this.peerConnections.get(senderId);
        if (peerConnection) {
            await peerConnection.setRemoteDescription(answer);
        }
    }

    async handleIceCandidate(candidate, senderId) {
        const peerConnection = this.peerConnections.get(senderId);
        if (peerConnection) {
            await peerConnection.addIceCandidate(candidate);
        }
    }

    handleUserLeft(userId) {
        const pc = this.peerConnections.get(userId);
        if (pc) pc.close();
        this.peerConnections.delete(userId);
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
                `ws://localhost:8000/ws/webrtc/${sessionId}/`,
                `ws://127.0.0.1:8000/ws/webrtc/${sessionId}/`,
                `wss://localhost:8000/ws/webrtc/${sessionId}/`,
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
        this.localStream?.getTracks().forEach(track => track.stop());
        this.localStream = null;
        this.peerConnections.forEach(pc => pc.close());
        this.peerConnections.clear();
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