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
  Calendar,
  Phone,
  PhoneOff,
  Check,
  ArrowLeft
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
import { toast } from "../../hooks/use-toast";


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

  // Add new state for pending join and rejection
  const [pendingApproval, setPendingApproval] = useState(false);
  const [rejected, setRejected] = useState(false);
  const [pendingParticipants, setPendingParticipants] = useState([]);
  const [isHost, setIsHost] = useState(false);
  const [showPendingRequestsDialog, setShowPendingRequestsDialog] = useState(false);
  
  // WebRTC service ref
  const webrtcService = useRef(null);
  const localVideoRef = useRef(null);

  // Add state for unread messages
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [chatOpen, setChatOpen] = useState(false);

  // Increment unread count when a new message arrives and chat is closed
  useEffect(() => {
    if (!chatOpen && messages.length > 0) {
      setUnreadMessages((prev) => prev + 1);
    }
    // eslint-disable-next-line
  }, [messages.length]);

  // Reset unread count when chat is opened
  useEffect(() => {
    if (chatOpen) setUnreadMessages(0);
  }, [chatOpen]);

  // Setup local video stream in the video element
  const setupLocalVideo = async () => {
    if (webrtcService.current && localVideoRef.current) {
      const stream = webrtcService.current.localStream;
      if (stream) {
        localVideoRef.current.srcObject = stream;
      }
    }
  };

  useEffect(() => {
    // Fetch active sessions on component mount
    fetchSessions();
  }, []);

  // Add useEffect to check if user is host and fetch pending participants
  useEffect(() => {
    if (currentSession && sessionStarted) {
      const checkIfHost = currentSession.creator_id === JSON.parse(localStorage.getItem('user'))?.id;
      setIsHost(checkIfHost);
      
      if (checkIfHost) {
        fetchPendingParticipants();
      }
    }
  }, [currentSession, sessionStarted]);

  // Function to fetch pending participants
  const fetchPendingParticipants = async () => {
    if (!currentSession || !isHost) return;
    
    try {
      const response = await userAxios.get(`/focus-sessions/${currentSession.id}/`);
      if (response.data && response.data.participants) {
        const pending = response.data.participants.filter(p => p.status === 'pending');
        setPendingParticipants(pending);
      }
    } catch (err) {
      console.error('Failed to fetch pending participants:', err);
    }
  };

  // Function to handle admitting a participant
  const handleAdmit = async (participantId) => {
    try {
      await userAxios.post(`/focus-sessions/${currentSession.id}/participants/${participantId}/approve/`);
      toast.success('Participant admitted successfully');
      // Real-time WebSocket update will handle UI refresh
    } catch (err) {
      console.error('Failed to admit participant:', err);
      toast.error('Failed to admit participant');
    }
  };

  // Function to handle rejecting a participant
  const handleReject = async (participantId) => {
    try {
      await userAxios.post(`/focus-sessions/${currentSession.id}/participants/${participantId}/reject/`);
      toast.success('Participant rejected');
      // Real-time WebSocket update will handle UI refresh
    } catch (err) {
      console.error('Failed to reject participant:', err);
      toast.error('Failed to reject participant');
    }
  };

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
  
  // Create a unified WebRTC initialization function

const initializeWebRTC = async (sessionId, isCreator = false) => {
  try {
    const checkMediaDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const hasVideo = devices.some(device => device.kind === 'videoinput');
        const hasAudio = devices.some(device => device.kind === 'audioinput');
        
        if (!hasVideo && isVideoOn) {
          console.warn('No video devices found, disabling video');
          setIsVideoOn(false);
        }
        if (!hasAudio && isAudioOn) {
          console.warn('No audio devices found, disabling audio');
          setIsAudioOn(false);
        }
      } catch (err) {
        console.error('Error checking media devices:', err);
      }
    };

    await checkMediaDevices();

    // Initialize WebRTC service
    webrtcService.current = new WebRTCService();
    
    // Set up event listeners
    webrtcService.current.on('userJoined', (userId, userName) => {
      // Defensive: ensure userId is always a number
      const id = typeof userId === 'object' && userId !== null ? userId.id : userId;
      console.log(`[FocusBuddy] userJoined event: userId=${id}, userName=${userName}`);
      setParticipants(prev => {
        // Prevent duplicates
        if (prev.some(p => p.id === id)) return prev;
        return [...prev, { id, user_name: userName, stream: null }];
      });
    });

    webrtcService.current.on('remoteStream', (userId, stream) => {
      const id = typeof userId === 'object' && userId !== null ? userId.id : userId;
      console.log(`[FocusBuddy] remoteStream event: userId=${id}, stream=`, stream);
      setParticipants(prev =>
        prev.map(p => p.id === id ? { ...p, stream } : p)
      );
    });

    webrtcService.current.on('userLeft', (userId) => {
      const id = typeof userId === 'object' && userId !== null ? userId.id : userId;
      console.log(`User left: ${id}`);
      setParticipants(prev => prev.filter(p => p.id !== id));
    });

    webrtcService.current.on('chatMessage', (message) => {
      console.log('Chat message received:', message);
      setMessages(prev => [...prev, message]);
    });

    webrtcService.current.on('existing-users', (users) => {
      console.log('Existing users:', users);
      setParticipants(prev => {
        // Add any users not already present
        const newParticipants = users
          .filter(userId => !prev.some(p => p.id === userId))
          .map(userId => ({ id: userId, user_name: `User ${userId}`, stream: null }));
        return [...prev, ...newParticipants];
      });
    });

    // Add real-time notification listeners for hosts
    if (isCreator) {
      webrtcService.current.on('newJoinRequest', (data) => {
        console.log('New join request received:', data);
        setPendingParticipants(prev => [...prev, {
          id: data.participant_id,
          user_name: data.user_name,
          user_id: data.user_id
        }]);
        toast.info(`${data.user_name} wants to join your session`);
        
        // Play notification sound
        try {
          const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT');
          audio.volume = 0.3;
          audio.play().catch(e => console.log('Audio play failed:', e));
        } catch (e) {
          console.log('Audio creation failed:', e);
        }
      });

      webrtcService.current.on('joinRequestUpdated', (data) => {
        console.log('Join request updated:', data);
        if (data.status === 'approved' || data.status === 'rejected') {
          setPendingParticipants(prev => prev.filter(p => p.id !== data.participant_id));
        }
      });
    }

    webrtcService.current.on('admissionStatus', async (status, message, sessionIdFromWS) => {
      console.log('Admission status:', status, message, sessionIdFromWS);
      if (status === 'pending') {
        setPendingApproval(true);
        setRejected(false);
        toast.info(message);
      } else if (status === 'rejected') {
        setRejected(true);
        setPendingApproval(false);
        setSessionStarted(false);
        setCurrentSession(null);
        toast.error(message);
      } else if (status === 'approved') {
        setPendingApproval(false);
        setRejected(false);
        toast.success('You have been admitted to the session!');
        if (sessionIdFromWS) {
          try {
            const sessionRes = await userAxios.get(`/focus-sessions/${sessionIdFromWS}/`);
            console.log('Fetched session details after approval:', sessionRes.data);
            if (sessionRes.data && Array.isArray(sessionRes.data.participants)) {
              console.log('Participants from API:', sessionRes.data.participants);
              setParticipants(sessionRes.data.participants.map(p => ({
                id: p.user_id,
                user_name: p.user_name,
                stream: null
              })));
            } else {
              console.warn('No participants array in session details response:', sessionRes.data);
              setParticipants([]);
            }
            setCurrentSession(sessionRes.data);
            // Set timer in sync with session start
            if (sessionRes.data.duration_minutes && sessionRes.data.started_at) {
              const startedAt = new Date(sessionRes.data.started_at);
              const now = new Date();
              const elapsed = Math.floor((now - startedAt) / 1000); // seconds
              const total = sessionRes.data.duration_minutes * 60;
              setTimeRemaining(Math.max(total - elapsed, 0));
            }
            setSessionStarted(true); // Only after session is fully loaded!
            await initializeWebRTC(sessionIdFromWS, true);
          } catch (err) {
            console.error('Failed to fetch session after approval:', err);
            toast.error('Failed to join session after approval.');
          }
        } else {
          toast.error('Session ID missing in approval event.');
        }
      }
    });

    // Initialize WebRTC connection
    await webrtcService.current.initialize(sessionId, null, 'group');
    
    // Set up local video
    await setupLocalVideo();
    
    console.log('WebRTC initialized successfully');
    
  } catch (err) {
    console.error('Failed to initialize WebRTC:', err);
    toast.error('Failed to initialize video/audio. Please check your permissions.');
    throw err;
  }
};

// Updated initializeWebRTCForCreator function
const initializeWebRTCForCreator = async (sessionId) => {
  try {
    await initializeWebRTC(sessionId, true);
    console.log('WebRTC initialized successfully for creator');
  } catch (err) {
    console.error('Failed to initialize WebRTC for creator:', err);
    toast.error('Failed to initialize video/audio. Session created but media features may not work.');
    throw err;
  }
};

// Updated joinSession function - replace the WebRTC initialization part
const joinSession = async (sessionId) => {
  try {
    setLoading(true);
    setPendingApproval(false);
    setRejected(false);
    
    const payload = {
      camera_enabled: isVideoOn,
      microphone_enabled: isAudioOn
    };
    
    console.log('Attempting to join session:', sessionId, 'with payload:', payload);
    
    // First try to join the session
    const joinResponse = await userAxios.post(`/focus-sessions/${sessionId}/join/`, payload);

    // Always set currentSession and open WebRTC, even if pending
    setCurrentSession({ id: sessionId });
    await initializeWebRTC(sessionId, false);

    if (joinResponse.data && joinResponse.data.pending) {
      setPendingApproval(true);
      setRejected(false);
      setSessionStarted(false);
      toast.info('Waiting for host approval...');
      // Do NOT return here! WebSocket must stay open!
    } else {
      setSessionStarted(true);
      toast.success('Joined session successfully');
    }
  } catch (err) {
    if (err.response && err.response.data && err.response.data.rejected) {
      setRejected(true);
      setPendingApproval(false);
      setSessionStarted(false);
      setCurrentSession(null);
      toast.error('Your join request was rejected by the host.');
      return;
    }
    console.error('Join session error:', err);
    
    // Error handling code remains the same...
    if (err.response) {
      const errorData = err.response.data;
      console.error('Error response:', errorData);
      console.error('Error status:', err.response.status);
      
      let errorMessage = 'Failed to join session';
      
      if (err.response.status === 400) {
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
      console.log('Sending message:', newMessage);
      
      if (webrtcService.current) {
        webrtcService.current.sendSignalingMessage({
          type: 'chat-message',  
          message: newMessage,
          sender_name: 'You'
        });
      }
      
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

const getVideoGridLayout = () => {
  const totalParticipants = 1 + participants.filter(p => p.is_active !== false).length;
  
  if (totalParticipants === 1) {
    return {
      containerClass: "grid grid-cols-1 gap-4 mb-4",
      videoClass: "relative bg-gray-900 h-[500px] rounded-xl overflow-hidden flex items-center justify-center shadow-lg" // Increased from h-96 (384px) to h-[500px]
    };
  } else if (totalParticipants === 2) {
    return {
      containerClass: "grid grid-cols-1 md:grid-cols-2 gap-4 mb-4",
      videoClass: "relative bg-gray-900 h-80 rounded-xl overflow-hidden flex items-center justify-center shadow-lg" 
    };
  } else if (totalParticipants <= 4) {
    return {
      containerClass: "grid grid-cols-2 gap-4 mb-4",
      videoClass: "relative bg-gray-900 h-72 rounded-xl overflow-hidden flex items-center justify-center shadow-lg" 
    };
  } else if (totalParticipants <= 6) {
    return {
      containerClass: "grid grid-cols-2 md:grid-cols-3 gap-4 mb-4",
      videoClass: "relative bg-gray-900 h-60 rounded-xl overflow-hidden flex items-center justify-center shadow-lg" 
    };
  } else {
    return {
      containerClass: "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-4",
      videoClass: "relative bg-gray-900 h-52 rounded-lg overflow-hidden flex items-center justify-center shadow-md"
    };
  }
};

  // Full-screen video layout when session is active
  if (sessionStarted && currentSession) {
    return (
      <div className="fixed inset-0 bg-black z-50">
        {/* Session Header */}
        <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/80 to-transparent z-10 p-6">
          <div className="flex justify-between items-center text-white">
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                size="sm"
                className="text-white hover:bg-white/20 p-2"
                onClick={leaveSession}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h3 className="font-semibold text-lg">{currentSession.title}</h3>
                <div className="flex items-center space-x-3 text-sm text-gray-300">
                  <Badge className={`${getSessionTypeColor(currentSession.session_type)} border-0`}>
                    {currentSession.session_type}
                  </Badge>
                  <span>•</span>
                  <span className="flex items-center">
                    <Users className="h-3 w-3 mr-1" />
                    {currentSession.participant_count || participants.length}/{currentSession.max_participants}
                  </span>
                </div>
              </div>
            </div>
            <div className="text-3xl font-light">
              {formatTime(timeRemaining)}
            </div>
          </div>
        </div>

        {/* Video Grid - Full Screen */}
        <div className="h-full flex items-center justify-center p-6 pt-24">
          {(() => {
            const layout = getVideoGridLayout();
            const myUserId = JSON.parse(localStorage.getItem('user'))?.id;
            
            return (
              <div className={layout.containerClass.replace('mb-4', 'h-full')}>
                {/* Render remote participants */}
                {participants.filter(p => p.id !== myUserId).map(p => (
                  <div key={p.id} className={layout.videoClass.replace('rounded-xl', 'rounded-2xl').replace('h-80', 'h-full').replace('h-72', 'h-full').replace('h-60', 'h-full').replace('h-52', 'h-full').replace('h-[500px]', 'h-full')}>
                    <video
                      ref={el => {
                        if (el && p.stream) {
                          el.srcObject = p.stream;
                          console.log('Attached stream to video element for user', p.id, p.stream);
                        }
                      }}
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute bottom-4 left-4">
                      <Badge className="bg-gradient-to-r from-purple-500 to-purple-600 text-white border-0 shadow-lg text-sm px-3 py-1">
                        {p.user_name || `User ${p.id}`}
                      </Badge>
                    </div>
                  </div>
                ))}
                {/* Render local video */}
                <div className={layout.videoClass.replace('rounded-xl', 'rounded-2xl').replace('h-80', 'h-full').replace('h-72', 'h-full').replace('h-60', 'h-full').replace('h-52', 'h-full').replace('h-[500px]', 'h-full')}>
                  <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
                  <div className="absolute bottom-4 left-4">
                    <Badge className="bg-gradient-to-r from-purple-500 to-purple-600 text-white border-0 shadow-lg text-sm px-3 py-1">
                      You
                    </Badge>
                  </div>
                  <div className="absolute top-4 right-4 flex space-x-2">
                    {!isVideoOn && (
                      <div className="bg-red-500 bg-opacity-90 rounded-full p-2 shadow-lg">
                        <VideoOff className="h-4 w-4 text-white" />
                      </div>
                    )}
                    {!isAudioOn && (
                      <div className="bg-red-500 bg-opacity-90 rounded-full p-2 shadow-lg">
                        <MicOff className="h-4 w-4 text-white" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Bottom Controls */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent z-10 p-6">
          <div className="flex justify-center items-center space-x-4">
            <Button 
              variant="outline" 
              size="lg"
              className={`${isVideoOn 
                ? 'border-2 border-white/30 text-white bg-white/10 hover:bg-white/20 backdrop-blur-sm' 
                : 'bg-red-500/90 border-2 border-red-400 text-white hover:bg-red-600/90 backdrop-blur-sm'
              } transition-all duration-200 shadow-lg`}
              onClick={toggleVideo}
            >
              {isVideoOn ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              className={`${isAudioOn 
                ? 'border-2 border-white/30 text-white bg-white/10 hover:bg-white/20 backdrop-blur-sm' 
                : 'bg-red-500/90 border-2 border-red-400 text-white hover:bg-red-600/90 backdrop-blur-sm'
              } transition-all duration-200 shadow-lg`}
              onClick={toggleAudio}
            >
              {isAudioOn ? <Mic className="h-6 w-6" /> : <MicOff className="h-6 w-6" />}
            </Button>
            
            <Popover open={chatOpen} onOpenChange={setChatOpen}>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline"
                  size="lg"
                  className="border-2 border-white/30 text-white bg-white/10 hover:bg-white/20 backdrop-blur-sm transition-all duration-200 shadow-lg relative"
                >
                  <span className="relative">
                    <MessageCircle className="h-6 w-6" />
                    {unreadMessages > 0 && (
                      <Badge className="absolute -top-3 -right-3 bg-red-500 text-white text-xs px-2 py-1 min-w-[24px] h-6 flex items-center justify-center">
                        {unreadMessages}
                      </Badge>
                    )}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 mb-4">
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
            
            {/* Host: Pending Requests Button */}
            {isHost && (
              <Button 
                variant="outline"
                size="lg"
                className="border-2 border-orange-300/50 text-orange-300 bg-orange-500/10 hover:bg-orange-500/20 backdrop-blur-sm transition-all duration-200 shadow-lg relative"
                onClick={() => setShowPendingRequestsDialog(true)}
                disabled={pendingParticipants.length === 0}
              >
                <UserPlus className="h-6 w-6" />
                {pendingParticipants.length > 0 && (
                  <Badge className="absolute -top-3 -right-3 bg-red-500 text-white text-xs px-2 py-1 min-w-[24px] h-6 flex items-center justify-center">
                    {pendingParticipants.length}
                  </Badge>
                )}
              </Button>
            )}
            
            <Button 
              variant="destructive"
              size="lg"
              className="bg-red-500/90 hover:bg-red-600/90 text-white shadow-lg transition-all duration-200 backdrop-blur-sm border-2 border-red-400/50"
              onClick={leaveSession}
              disabled={loading}
            >
              <X className="h-5 w-5 mr-2" />
              Leave
            </Button>
          </div>
        </div>

        {/* Pending Requests Dialog */}
        <Dialog open={showPendingRequestsDialog} onOpenChange={setShowPendingRequestsDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center text-orange-600">
                <UserPlus className="h-5 w-5 mr-2" />
                Pending Join Requests ({pendingParticipants.length})
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {pendingParticipants.length === 0 ? (
                <div className="text-center py-8">
                  <UserPlus className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-500">No pending join requests</p>
                </div>
              ) : (
                pendingParticipants.map(participant => (
                  <div key={participant.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center">
                      <Avatar className="h-10 w-10 mr-3">
                        <AvatarFallback className="bg-blue-100 text-blue-600">
                          {participant.user_name?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-gray-900">{participant.user_name}</p>
                        <p className="text-sm text-gray-500">Wants to join your session</p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button 
                        size="sm" 
                        className="bg-green-500 hover:bg-green-600 text-white"
                        onClick={() => {
                          handleAdmit(participant.id);
                          if (pendingParticipants.length === 1) {
                            setShowPendingRequestsDialog(false);
                          }
                        }}
                      >
                        Admit
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => {
                          handleReject(participant.id);
                          if (pendingParticipants.length === 1) {
                            setShowPendingRequestsDialog(false);
                          }
                        }}
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setShowPendingRequestsDialog(false)}
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Regular UI when no session is active
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
        
        {/* Pending Approval State */}
        {pendingApproval && (
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-3 rounded mb-4 text-center">
            Waiting for host approval to join the session...
          </div>
        )}
        
        {/* Rejected State */}
        {rejected && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 text-center">
            Your join request was rejected by the host.
          </div>
        )}
        
        {/* Available Sessions */}
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
      </div>
      <ToastContainer/>
    </div>
  );
}

export default FocusBuddy;