import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Video, VideoOff, Mic, MicOff, Phone, MessageSquare, Clock, Send, Users, X } from 'lucide-react';
import WebRTCService from '../utils/webrtcService';
import { useParams, useNavigate } from 'react-router-dom';

const VideoCallPage = ({ onEndCall }) => {
  const [webrtcService, setWebrtcService] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [remoteVideoEnabled, setRemoteVideoEnabled] = useState(true);
  const [remoteAudioEnabled, setRemoteAudioEnabled] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [participantInfo, setParticipantInfo] = useState({ mentor: null, student: null });
  const [sessionInfo, setSessionInfo] = useState({ startTime: null, duration: 0, status: 'waiting' });
  const navigate = useNavigate();
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const chatContainerRef = useRef(null);
  const timerRef = useRef(null);
  const { sessionId } = useParams();

  const getUserRole = () => localStorage.getItem('role');

  const getCookie = (name) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
  };

  const startTimer = () => {
    timerRef.current = setInterval(() => {
      setSessionInfo(prev => ({
        ...prev,
        duration: prev.startTime ? Math.floor((new Date() - prev.startTime) / 1000) : 0
      }));
    }, 1000);
  };

  useEffect(() => {
    const initializeWebRTC = async () => {
      try {
        const authToken = getCookie('access');
        const userRole = getUserRole();
        const service = new WebRTCService();

        // --- Set callType and log it ---
        const callType = (userRole === 'mentor' || userRole === 'student') ? 'mentor' : 'group';
        console.log('VideoCallPage: callType =', callType, 'sessionId =', sessionId);
        // -------------------------------

        service.on('localStream', (stream) => {
          setLocalStream(stream);
          if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        });

        service.on('remoteStream', (userId, stream) => {
          setRemoteStream(stream);
          if (remoteVideoRef.current) remoteVideoRef.current.srcObject = stream;
          setIsConnected(true);
        });

        service.on('connectionStateChange', (state) => {
          setConnectionStatus(state);
          if (state === 'connected') setIsConnected(true);
          if (state === 'disconnected') setIsConnected(false);
        });

        service.on('chatMessage', (msg) => {
          setChatMessages(prev => [...prev, msg]);
          setTimeout(() => {
            if (chatContainerRef.current)
              chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
          }, 100);
        });

        service.on('peerMediaStateChanged', (mediaState) => {
          setRemoteVideoEnabled(mediaState.videoEnabled);
          setRemoteAudioEnabled(mediaState.audioEnabled);
        });

        service.on('sessionStartedNotification', () => {
          if (userRole === 'user') {
            setSessionInfo(prev => ({ ...prev, status: 'active', startTime: new Date() }));
            startTimer();
            service.notifyJoinSession();
          }
        });

        // --- Use callType from above ---
        const success = await service.initialize(sessionId, authToken, callType);
        if (success) {
          setWebrtcService(service);
          setConnectionStatus('connected');
          if (userRole === 'mentor') {
            setSessionInfo({ status: 'active', startTime: new Date(), duration: 0 });
            startTimer();
          }
        } else {
          setConnectionStatus('failed');
        }
      } catch (error) {
        console.error(error);
        setConnectionStatus('error');
      }
    };

    if (sessionId) initializeWebRTC();

    return () => {
      if (webrtcService) webrtcService.cleanup();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [sessionId]);

  const toggleVideo = () => {
    if (webrtcService) {
      const enabled = webrtcService.toggleVideo();
      setIsVideoEnabled(enabled);
    }
  };

  const toggleAudio = () => {
    if (webrtcService) {
      const enabled = webrtcService.toggleAudio();
      setIsAudioEnabled(enabled);
    }
  };

  const endCall = () => {
    webrtcService?.cleanup();
    navigate(-1);
    onEndCall?.();
  };

  const sendChatMessage = () => {
    if (newMessage.trim() && webrtcService) {
      webrtcService.sendChatMessage({ message: newMessage });
      setNewMessage('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  };

  const formatDuration = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className="h-screen bg-black text-white flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex justify-between p-4 bg-gray-900 flex-shrink-0">
        <div className="flex gap-4 items-center">
          <h2 className="text-xl font-semibold">Video Call</h2>
          <div>{connectionStatus}</div>
        </div>
        <div className="flex gap-4">
          {sessionInfo.status === 'active' && (
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" /> {formatDuration(sessionInfo.duration)}
            </div>
          )}
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" /> {isConnected ? 2 : 1}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex min-h-0">
        {/* Video Area */}
        <div className="flex-1 relative">
          <video 
            ref={remoteVideoRef} 
            autoPlay 
            playsInline 
            className="w-full h-full object-cover bg-black" 
          />
          <video 
            ref={localVideoRef} 
            autoPlay 
            playsInline 
            muted 
            className="absolute bottom-4 right-4 w-40 h-32 bg-gray-800 rounded-lg" 
          />
        </div>

        {/* Chat Panel */}
        {showChat && (
          <div className="w-80 bg-white text-black flex flex-col flex-shrink-0">
            {/* Chat Header */}
            <div className="p-4 border-b flex justify-between items-center flex-shrink-0">
              <h4 className="font-semibold">Chat</h4>
              <button 
                onClick={() => setShowChat(false)}
                className="hover:bg-gray-100 p-1 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Chat Messages - Scrollable */}
            <div 
              ref={chatContainerRef} 
              className="flex-1 overflow-y-auto p-4 space-y-2 min-h-0"
            >
              {chatMessages.map((msg, idx) => (
                <div key={idx} className="bg-gray-100 p-2 rounded">
                  <div className="text-sm font-semibold text-gray-600">{msg.senderName}</div>
                  <div className="text-gray-800">
                    {typeof msg.message === 'string' ? msg.message : msg.message?.message}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Chat Input */}
            <div className="p-4 border-t flex gap-2 flex-shrink-0">
              <input
                className="flex-1 border border-gray-300 p-2 rounded focus:outline-none focus:border-purple-600"
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
              />
              <button 
                onClick={sendChatMessage} 
                className="bg-purple-600 hover:bg-purple-700 text-white p-2 rounded transition-colors"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="bg-gray-900 p-4 flex justify-center gap-4 flex-shrink-0">
        <button 
          onClick={toggleAudio} 
          className={`p-3 rounded-full transition-colors ${
            isAudioEnabled ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700'
          }`}
        >
          {isAudioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
        </button>
        <button 
          onClick={toggleVideo} 
          className={`p-3 rounded-full transition-colors ${
            isVideoEnabled ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700'
          }`}
        >
          {isVideoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
        </button>
        <button 
          onClick={() => setShowChat(!showChat)} 
          className={`p-3 rounded-full transition-colors ${
            showChat ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-700 hover:bg-gray-600'
          }`}
        >
          <MessageSquare className="w-5 h-5" />
        </button>
        <button 
          onClick={endCall} 
          className="p-3 rounded-full bg-red-600 hover:bg-red-700 transition-colors"
        >
          <Phone className="w-5 h-5 rotate-135" />
        </button>
      </div>
    </div>
  );
};

export default VideoCallPage;