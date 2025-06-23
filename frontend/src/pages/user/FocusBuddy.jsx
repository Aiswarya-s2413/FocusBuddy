import React, { useState, useEffect, useRef } from "react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { 
  Video, 
  Mic, 
  MicOff, 
  Users, 
  MessageCircle, 
  X, 
  Plus,
  Clock,
  Send,
  VideoOff,
  Settings,
  UserPlus,
  Calendar
} from "lucide-react";
import { Toggle } from "../../components/ui/toggle";
import {
  ToggleGroup,
  ToggleGroupItem
} from "../../components/ui/toggle-group";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger
} from "../../components/ui/dialog";
import {
  Popover,
  PopoverTrigger,
  PopoverContent
} from "../../components/ui/popover";
import { 
  Avatar,
  AvatarFallback,
  AvatarImage
} from "../../components/ui/avatar";
import { Badge } from "../../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { userAxios } from "../../utils/axios";
import { useSimpleToast } from "../../components/ui/toast";
import WebRTCService from "../../utils/webrtcService";


const WEBRTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    
  ],
  iceCandidatePoolSize: 10,
  bundlePolicy: 'max-bundle',
  rtcpMuxPolicy: 'require'
};

function FocusBuddy() {
  // State for sessions and UI - Initialize as empty array
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const { toast, ToastContainer } = useSimpleToast();
  
  // State for creating new session
  const [newSessionTitle, setNewSessionTitle] = useState('');
  const [sessionType, setSessionType] = useState('study');
  const [duration, setDuration] = useState('25');
  const [maxParticipants, setMaxParticipants] = useState(4);

  // State for active session
  const [currentSession, setCurrentSession] = useState(null);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  
  // WebRTC state
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [participants, setParticipants] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  
  // WebRTC service ref
  const webrtcService = useRef(null);
  const localVideoRef = useRef(null);

  useEffect(() => {
    // Fetch active sessions on component mount
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      setError(null); // Clear previous errors
      const response = await userAxios.get('/focus-sessions/');
      
      // Ensure we always set an array
      const sessionsData = response.data;
      if (Array.isArray(sessionsData)) {
        setSessions(sessionsData);
      } else if (sessionsData && Array.isArray(sessionsData.results)) {
        // Handle paginated response
        setSessions(sessionsData.results);
      } else if (sessionsData && sessionsData.sessions && Array.isArray(sessionsData.sessions)) {
        // Handle nested sessions
        setSessions(sessionsData.sessions);
      } else {
        // Fallback to empty array
        console.warn('Unexpected API response format:', sessionsData);
        setSessions([]);
      }
    } catch (err) {
      console.error('Fetch sessions error:', err);
      setError('Failed to fetch sessions');
      toast.error('Failed to fetch sessions');
      setSessions([]); // Ensure sessions is always an array
    } finally {
      setLoading(false);
    }
  };

  const createSession = async () => {
    console.log('Creating session with payload:', {
      title: newSessionTitle,
      session_type: sessionType,
      duration_minutes: parseInt(duration),
      max_participants: parseInt(maxParticipants)
    });
    
    try {
      setLoading(true);
      const response = await userAxios.post('/focus-sessions/', {
        title: newSessionTitle,
        session_type: sessionType,
        duration_minutes: parseInt(duration),
        max_participants: parseInt(maxParticipants)
      });
      
      console.log('Session created successfully:', response.data);
      
      // Safely update sessions array
      setSessions(prevSessions => {
        const currentSessions = Array.isArray(prevSessions) ? prevSessions : [];
        return [...currentSessions, response.data];
      });
      
      // Close dialog and reset form
      setShowCreateDialog(false);
      setNewSessionTitle('');
      toast.success('Session created successfully');
      
      // For creators, start the session directly without trying to "join"
      // since they're already the creator and host
      console.log('Starting session directly for creator...');
      setCurrentSession(response.data);
      setTimeRemaining(response.data.duration_minutes * 60);
      setSessionStarted(true);
      
      // Initialize WebRTC for the creator
      await initializeWebRTCForCreator(response.data.id);
      
      toast.success('Session started successfully');
      
    } catch (err) {
      console.error('Create session error:', err);
      
      if (err.response) {
        console.error('Create session error response:', err.response.data);
        const errorMessage = err.response.data?.detail || err.response.data?.message || 'Failed to create session';
        toast.error(errorMessage);
      } else {
        toast.error('Failed to create session');
      }
    } finally {
      setLoading(false);
    }
  };
  
  // Separate function to initialize WebRTC for session creators
  const initializeWebRTCForCreator = async (sessionId) => {
    try {
      const checkMediaDevices = async () => {
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const hasVideo = devices.some(device => device.kind === 'videoinput');
          const hasAudio = devices.some(device => device.kind === 'audioinput');
          
          if (!hasVideo && isVideoOn) {
            toast.warning('No camera detected');
            setIsVideoOn(false);
          }
          if (!hasAudio && isAudioOn) {
            toast.warning('No microphone detected');
            setIsAudioOn(false);
          }
          
          return true;
        } catch (err) {
          console.error('Media devices check failed:', err);
          toast.error('Failed to access media devices');
          return false;
        }
      };
      
      if (!(await checkMediaDevices())) {
        throw new Error('Media devices not available');
      }
  
      // Initialize WebRTC service for creator
      webrtcService.current = new WebRTCService({
        config: WEBRTC_CONFIG,
        mediaConstraints: {
          audio: isAudioOn,
          video: isVideoOn ? {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user'
          } : false
        }
      });
      
      // Set up event listeners
      webrtcService.current.on('localStream', (stream) => {
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      });
  
      webrtcService.current.on('remoteStream', (userId, stream) => {
        setParticipants(prev => {
          const existing = prev.find(p => p.id === userId);
          if (existing) {
            return prev.map(p => p.id === userId ? { ...p, stream } : p);
          }
          return [...prev, { id: userId, stream, user_name: `User ${userId}` }];
        });
      });
  
      webrtcService.current.on('userJoined', (user) => {
        setParticipants(prev => {
          const existing = prev.find(p => p.id === user.id);
          if (!existing) {
            return [...prev, { 
              id: user.id, 
              user_name: user.name,
              camera_enabled: true,
              microphone_enabled: true,
              is_active: true
            }];
          }
          return prev;
        });
      });
  
      webrtcService.current.on('userLeft', (userId) => {
        setParticipants(prev => prev.filter(p => p.id !== userId));
      });
  
      webrtcService.current.on('error', (error) => {
        console.error('WebRTC Error:', error);
        toast.error('Connection error occurred');
      });
  
      webrtcService.current.on('chatMessage', (message) => {
        setMessages(prev => [...prev, {
          sender_name: message.sender_name,
          message: message.message
        }]);
      });
  
      // Initialize WebRTC for the creator
      const initSuccess = await webrtcService.current.initialize(sessionId);
      if (!initSuccess) {
        throw new Error('Failed to initialize WebRTC for creator');
      }
      
      console.log('WebRTC initialized successfully for creator');
      
    } catch (err) {
      console.error('Failed to initialize WebRTC for creator:', err);
      toast.error('Failed to initialize video/audio. Session created but media features may not work.');
      
      // Don't fail the entire session creation just because WebRTC failed
      if (webrtcService.current) {
        webrtcService.current.cleanup();
        webrtcService.current = null;
      }
    }
  };
  const joinSession = async (sessionId) => {
    try {
      setLoading(true);
      
      const payload = {
        camera_enabled: isVideoOn,
        microphone_enabled: isAudioOn
      };
      
      console.log('Attempting to join session:', sessionId, 'with payload:', payload);
      
      // First try to join the session
      const joinResponse = await userAxios.post(`/focus-sessions/${sessionId}/join/`, payload);
      
      if (!joinResponse.data) {
        throw new Error('No data received from join request');
      }
  
      console.log('Successfully joined session:', joinResponse.data);
  
      const checkMediaDevices = async () => {
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const hasVideo = devices.some(device => device.kind === 'videoinput');
          const hasAudio = devices.some(device => device.kind === 'audioinput');
          
          if (!hasVideo && isVideoOn) {
            toast.warning('No camera detected');
            setIsVideoOn(false);
          }
          if (!hasAudio && isAudioOn) {
            toast.warning('No microphone detected');
            setIsAudioOn(false);
          }
          
          return true;
        } catch (err) {
          console.error('Media devices check failed:', err);
          toast.error('Failed to access media devices');
          return false;
        }
      };
      
      if (!(await checkMediaDevices())) {
        throw new Error('Media devices not available');
      }
  
      // Initialize WebRTC only after successful join
      webrtcService.current = new WebRTCService({
        config: WEBRTC_CONFIG,
        mediaConstraints: {
          audio: isAudioOn,
          video: isVideoOn ? {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user'
          } : false
        }
      });
      
      // Set up event listeners before initialization
      webrtcService.current.on('localStream', (stream) => {
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      });
  
      webrtcService.current.on('remoteStream', (userId, stream) => {
        setParticipants(prev => {
          const existing = prev.find(p => p.id === userId);
          if (existing) {
            return prev.map(p => p.id === userId ? { ...p, stream } : p);
          }
          return [...prev, { id: userId, stream, user_name: `User ${userId}` }];
        });
      });
  
      webrtcService.current.on('userJoined', (user) => {
        setParticipants(prev => {
          const existing = prev.find(p => p.id === user.id);
          if (!existing) {
            return [...prev, { 
              id: user.id, 
              user_name: user.name,
              camera_enabled: true,
              microphone_enabled: true,
              is_active: true
            }];
          }
          return prev;
        });
      });
  
      webrtcService.current.on('userLeft', (userId) => {
        setParticipants(prev => prev.filter(p => p.id !== userId));
      });
  
      webrtcService.current.on('peerMediaStateChanged', ({ videoEnabled, audioEnabled, senderId }) => {
        setParticipants(prev => prev.map(p => 
          p.id === senderId 
            ? { ...p, camera_enabled: videoEnabled, microphone_enabled: audioEnabled }
            : p
        ));
      });
  
      webrtcService.current.on('error', (error) => {
        console.error('WebRTC Error:', error);
        toast.error('Connection error occurred');
      });
  
      webrtcService.current.on('connectionStateChange', (state) => {
        console.log('Connection state:', state);
        if (state === 'connected') {
          toast.success('Connected to session');
        } else if (state === 'disconnected') {
          toast.warning('Disconnected from session');
        }
      });
  
      webrtcService.current.on('chatMessage', (message) => {
        setMessages(prev => [...prev, {
          sender_name: message.sender_name,
          message: message.message
        }]);
      });
  
      webrtcService.current.on('iceConnectionStateChange', (state) => {
        console.log('ICE connection state:', state);
        if (state === 'failed') {
          toast.error('Connection failed - attempting to reconnect...');
          webrtcService.current.restartIce();
        } else if (state === 'disconnected') {
          toast.warning('Connection interrupted - attempting to recover...');
        }
      });
  
      if (webrtcService.current.websocket) {
        webrtcService.current.websocket.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            webrtcService.current.handleSignalingMessage(message);
            
            // Handle chat messages specifically
            if (message.type === 'chat' && message.sender_name !== 'You') {
              setMessages(prev => [...prev, {
                sender_name: message.sender_name,
                message: message.message
              }]);
            }
          } catch (error) {
            console.error('Error handling WebSocket message:', error);
          }
        };
      }
  
      // Initialize WebRTC
      const initSuccess = await webrtcService.current.initialize(sessionId);
      if (!initSuccess) {
        // Clean up if WebRTC initialization fails
        await userAxios.post(`/focus-sessions/${sessionId}/leave/`);
        throw new Error('Failed to initialize WebRTC');
      }
      
      setCurrentSession(joinResponse.data);
      setTimeRemaining(joinResponse.data.duration_minutes * 60);
      setSessionStarted(true);
      toast.success('Joined session successfully');
      
    } catch (err) {
      console.error('Join session error:', err);
      
      // More detailed error handling
      if (err.response) {
        const errorData = err.response.data;
        console.error('Error response:', errorData);
        console.error('Error status:', err.response.status);
        
        let errorMessage = 'Failed to join session';
        
        if (err.response.status === 400) {
          // Handle different types of 400 errors
          if (errorData.non_field_errors && Array.isArray(errorData.non_field_errors)) {
            errorMessage = errorData.non_field_errors[0];
          } else if (errorData.detail) {
            errorMessage = errorData.detail;
          } else if (errorData.message) {
            errorMessage = errorData.message;
          } else if (typeof errorData === 'string') {
            errorMessage = errorData;
          }
        } else if (err.response.status === 403) {
          errorMessage = 'You do not have permission to join this session';
        } else if (err.response.status === 404) {
          errorMessage = 'Session not found';
        } else if (err.response.status === 409) {
          errorMessage = 'Session is full or already ended';
        }
        
        toast.error(errorMessage);
      } else if (err.message) {
        toast.error(err.message);
      } else {
        toast.error('An unexpected error occurred while joining the session');
      }
      
      // Clean up on failure
      if (webrtcService.current) {
        webrtcService.current.cleanup();
        webrtcService.current = null;
      }
      
      setCurrentSession(null);
      setSessionStarted(false);
      setParticipants([]);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };
  const leaveSession = async () => {
    try {
      if (currentSession) {
        await userAxios.post(`/focus-sessions/${currentSession.id}/leave/`);
        
        // Cleanup WebRTC
        if (webrtcService.current) {
          webrtcService.current.cleanup();
        }
        
        setCurrentSession(null);
        setSessionStarted(false);
        setParticipants([]);
        setMessages([]);
        
        // Refresh sessions list
        await fetchSessions();
      }
    } catch (err) {
      console.error('Leave session error:', err);
      toast.error('Failed to leave session');
    }
  };

  const toggleVideo = () => {
    if (webrtcService.current) {
      const newState = webrtcService.current.toggleVideo();
      setIsVideoOn(newState);
    } else {
      setIsVideoOn(!isVideoOn);
    }
  };

  const toggleAudio = () => {
    if (webrtcService.current) {
      const newState = webrtcService.current.toggleAudio();
      setIsAudioOn(newState);
    } else {
      setIsAudioOn(!isAudioOn);
    }
  };

  const sendMessage = () => {
    if (newMessage.trim() && currentSession) {
      if (webrtcService.current) {
        webrtcService.current.sendSignalingMessage({
          type: 'chat',
          message: newMessage,
          sender_name: 'You' // get this from user context
        });
      }
      setMessages(prev => [...prev, {
        sender_name: 'You',
        message: newMessage
      }]);
      setNewMessage('');
    }
  };

  // Helper functions
  const getSessionTypeColor = (type) => {
    const colors = {
      study: 'bg-blue-100 text-blue-800',
      work: 'bg-green-100 text-green-800',
      reading: 'bg-purple-100 text-purple-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDuration = (startTime, endTime) => {
    if (!startTime || !endTime) return 'N/A';
    const start = new Date(startTime);
    const end = new Date(endTime);
    const duration = Math.round((end - start) / (1000 * 60));
    return `${duration} min`;
  };

  // Timer effect
  useEffect(() => {
    let interval = null;
    if (sessionStarted && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining(time => {
          if (time <= 1) {
            setSessionStarted(false);
            toast.info('Session ended');
            return 0;
          }
          return time - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [sessionStarted, timeRemaining, toast]);

  useEffect(() => {
    return () => {
      if (webrtcService.current) {
        webrtcService.current.cleanup();
      }
    };
  }, []);

  //  to track local media states
useEffect(() => {
  if (webrtcService.current) {
    const states = webrtcService.current.getMediaStates();
    setIsVideoOn(states.video);
    setIsAudioOn(states.audio);
  }
}, []);


useEffect(() => {
  // Add request interceptor
  const requestInterceptor = userAxios.interceptors.request.use(
    (config) => {
      console.log('API Request:', {
        method: config.method,
        url: config.url,
        data: config.data,
        headers: config.headers
      });
      return config;
    },
    (error) => {
      console.error('Request Error:', error);
      return Promise.reject(error);
    }
  );

  // Add response interceptor
  const responseInterceptor = userAxios.interceptors.response.use(
    (response) => {
      console.log('API Response:', {
        status: response.status,
        url: response.config.url,
        data: response.data
      });
      return response;
    },
    (error) => {
      console.error('Response Error:', {
        status: error.response?.status,
        url: error.config?.url,
        data: error.response?.data,
        message: error.message
      });
      return Promise.reject(error);
    }
  );

 

  // Cleanup interceptors
  return () => {
    userAxios.interceptors.request.eject(requestInterceptor);
    userAxios.interceptors.response.eject(responseInterceptor);
  };
}, []);

  return (
    <div className="min-h-screen bg-[#F8F6FB]">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-[#6E59A5]">Focus Buddy Sessions</h1>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="bg-[#9b87f5] hover:bg-[#7E69AB] text-white">
                <Plus className="mr-2 h-4 w-4" /> Create Session
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-[#6E59A5]">Create New Focus Session</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="title">Session Title</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Math Study Session"
                    value={newSessionTitle}
                    onChange={(e) => setNewSessionTitle(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Session Type</Label>
                  <ToggleGroup 
                    type="single" 
                    value={sessionType} 
                    onValueChange={(val) => val && setSessionType(val)}
                    className="grid grid-cols-3 gap-2 mt-2"
                  >
                    <ToggleGroupItem value="study" className="data-[state=on]:bg-[#9b87f5] data-[state=on]:text-white">
                      Study
                    </ToggleGroupItem>
                    <ToggleGroupItem value="work" className="data-[state=on]:bg-[#9b87f5] data-[state=on]:text-white">
                      Work
                    </ToggleGroupItem>
                    <ToggleGroupItem value="reading" className="data-[state=on]:bg-[#9b87f5] data-[state=on]:text-white">
                      Reading
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>
                <div>
                  <Label>Duration</Label>
                  <ToggleGroup 
                    type="single" 
                    value={duration} 
                    onValueChange={(val) => val && setDuration(val)}
                    className="grid grid-cols-3 gap-2 mt-2"
                  >
                    <ToggleGroupItem value="15" className="data-[state=on]:bg-[#9b87f5] data-[state=on]:text-white">
                      15 min
                    </ToggleGroupItem>
                    <ToggleGroupItem value="25" className="data-[state=on]:bg-[#9b87f5] data-[state=on]:text-white">
                      25 min
                    </ToggleGroupItem>
                    <ToggleGroupItem value="50" className="data-[state=on]:bg-[#9b87f5] data-[state=on]:text-white">
                      50 min
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>
                <div>
                  <Label htmlFor="participants">Max Participants</Label>
                  <Input
                    id="participants"
                    type="number"
                    min="2"
                    max="20"
                    value={maxParticipants}
                    onChange={(e) => setMaxParticipants(parseInt(e.target.value) || 2)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => setShowCreateDialog(false)}
                >
                  Cancel
                </Button>
                <Button 
                  className="bg-[#9b87f5] hover:bg-[#7E69AB] text-white"
                  onClick={createSession}
                  disabled={loading || !newSessionTitle.trim()}
                >
                  Create Session
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        
        {/* Error Display */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        {/* Loading State */}
        {loading && (
          <div className="text-center py-8">
            <div className="text-[#6E59A5]">Loading...</div>
          </div>
        )}
        
        {/* Active Session */}
        {sessionStarted && currentSession && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-8">
            <div className="bg-[#F0EBFF] p-4 flex justify-between items-center">
              <div className="mr-4">
                <h3 className="font-semibold text-[#6E59A5]">{currentSession.title}</h3>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Badge className={getSessionTypeColor(currentSession.session_type)}>
                    {currentSession.session_type}
                  </Badge>
                  <span>•</span>
                  <span className="flex items-center">
                    <Users className="h-3 w-3 mr-1" />
                    {currentSession.participant_count || participants.length}/{currentSession.max_participants}
                  </span>
                </div>
              </div>
              <div className="text-2xl font-light text-[#7E69AB]">
                {formatTime(timeRemaining)}
              </div>
            </div>
            
            <div className="p-2 md:p-6">
              {/* Video Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                {/* Your video */}
                <div className="relative bg-gray-900 h-48 rounded-lg overflow-hidden flex items-center justify-center">
                  {isVideoOn ? (
                    <video 
                      ref={localVideoRef}
                      autoPlay 
                      muted 
                      playsInline
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center">
                      <VideoOff className="h-8 w-8 mx-auto mb-2 text-gray-600" />
                      <p className="text-gray-400 text-sm">Camera Off</p>
                    </div>
                  )}
                  <div className="absolute bottom-2 left-2">
                    <Badge variant="secondary" className="text-xs">You</Badge>
                  </div>
                </div>
                
                {/* Other participants */}
{Array.isArray(participants) && participants
  .filter(p => p.is_active !== false)
  .map((participant) => (
  <div key={participant.id} className="relative bg-gray-900 h-48 rounded-lg overflow-hidden flex items-center justify-center">
    {participant.stream ? (
      <video 
        autoPlay 
        playsInline
        className="w-full h-full object-cover"
        ref={(videoEl) => {
          if (videoEl && participant.stream) {
            videoEl.srcObject = participant.stream;
          }
        }}
      />
    ) : (
      <div className="text-center">
        <Avatar className="h-12 w-12 mx-auto mb-2">
          <AvatarFallback className="bg-[#9b87f5] text-white">
            {participant.user_name?.charAt(0) || 'U'}
          </AvatarFallback>
        </Avatar>
        <p className="text-gray-400 text-sm">{participant.user_name}</p>
      </div>
    )}
    <div className="absolute bottom-2 left-2">
      <Badge variant="secondary" className="text-xs">{participant.user_name}</Badge>
    </div>
    {!participant.camera_enabled && (
      <div className="absolute top-2 right-2">
        <VideoOff className="h-4 w-4 text-gray-400" />
      </div>
    )}
    {!participant.microphone_enabled && (
      <div className="absolute top-2 right-8">
        <MicOff className="h-4 w-4 text-gray-400" />
      </div>
    )}
  </div>
))}
              </div>
              
              {/* Controls */}
              <div className="flex flex-wrap justify-between items-center">
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    className={`${isVideoOn ? 'border-[#9b87f5] text-[#9b87f5]' : 'bg-red-100 border-red-300 text-red-500'} hover:bg-[#F8F6FB]`}
                    onClick={toggleVideo}
                  >
                    {isVideoOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                  </Button>
                  <Button 
                    variant="outline" 
                    className={`${isAudioOn ? 'border-[#9b87f5] text-[#9b87f5]' : 'bg-red-100 border-red-300 text-red-500'} hover:bg-[#F8F6FB]`}
                    onClick={toggleAudio}
                  >
                    {isAudioOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                  </Button>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button 
                        variant="outline"
                        className="border-[#9b87f5] text-[#9b87f5] hover:bg-[#F8F6FB]"
                      >
                        <MessageCircle className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80">
                      <div className="space-y-4">
                        <h3 className="font-medium text-[#6E59A5]">Chat</h3>
                        <div className="h-40 overflow-y-auto bg-gray-50 rounded p-2 text-xs">
                          {messages.length === 0 ? (
                            <p className="text-gray-500 text-center">No messages yet</p>
                          ) : (
                            messages.map((msg, index) => (
                              <p key={index} className="mb-1">
                                <strong>{msg.sender_name}:</strong> {msg.message}
                              </p>
                            ))
                          )}
                        </div>
                        <div className="flex space-x-2">
                          <Input 
                            placeholder="Type a message..."
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                            className="text-sm"
                          />
                          <Button 
                            size="sm" 
                            className="bg-[#9b87f5] hover:bg-[#7E69AB]"
                            onClick={sendMessage}
                            disabled={!newMessage.trim()}
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
                <Button 
                  variant="destructive"
                  onClick={leaveSession}
                  disabled={loading}
                >
                  Leave Session
                </Button>
              </div>
            </div>
          </div>
        )}
        
        {/* Available Sessions */}
        {!sessionStarted && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-[#6E59A5]">Active Sessions</h2>
            
            {!loading && Array.isArray(sessions) && sessions.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No active sessions</h3>
                  <p className="text-gray-600 mb-4">Be the first to create a focus session!</p>
                  <Button 
                    className="bg-[#9b87f5] hover:bg-[#7E69AB] text-white"
                    onClick={() => setShowCreateDialog(true)}
                  >
                    Create Session
                  </Button>
                </CardContent>
              </Card>
            ) : !loading && Array.isArray(sessions) ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sessions.map((session) => (
                  <Card key={session.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg text-[#6E59A5]">{session.title}</CardTitle>
                          <p className="text-sm text-gray-600">by {session.creator_name}</p>
                        </div>
                        <Badge className={getSessionTypeColor(session.session_type)}>
                          {session.session_type}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center text-gray-600">
                            <Users className="h-4 w-4 mr-1" />
                            {session.participant_count || 0}/{session.max_participants}
                          </span>
                          <span className="flex items-center text-gray-600">
                            <Clock className="h-4 w-4 mr-1" />
                            {formatDuration(session.started_at, session.ends_at)}
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-500">
                            {session.duration_minutes} min session
                          </span>
                          <Button 
                            size="sm"
                            className="bg-[#9b87f5] hover:bg-[#7E69AB] text-white"
                            onClick={() => joinSession(session.id)}
                            disabled={loading || !session.can_join || session.is_full}
                          >
                            <UserPlus className="h-4 w-4 mr-1" />
                            {session.is_full ? 'Full' : 'Join'}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : null}
          </div>
        )}
      </div>
      <ToastContainer/>
    </div>
  );
}

export default FocusBuddy;