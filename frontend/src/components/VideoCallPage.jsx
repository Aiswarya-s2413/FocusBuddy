import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Video, VideoOff, Mic, MicOff, Phone, MessageSquare, Clock, Send, Users, X } from 'lucide-react';
import WebRTCService from '../utils/webrtcService';
import { useParams } from 'react-router-dom';

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

        const success = await service.initialize(sessionId, authToken, userRole);
        if (success) {
          setWebrtcService(service);
          setConnectionStatus('connected');
          if (userRole === 'mentor') {
            service.notifySessionStarted('Session started');
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
    <div className="min-h-screen bg-black text-white flex flex-col">
      <div className="flex justify-between p-4 bg-gray-900">
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

      <div className="flex-1 flex">
        <div className="flex-1 relative">
          <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover bg-black" />
          <video ref={localVideoRef} autoPlay playsInline muted className="absolute bottom-4 right-4 w-40 h-32 bg-gray-800" />
        </div>

        {showChat && (
          <div className="w-80 bg-white text-black flex flex-col">
            <div className="p-4 border-b flex justify-between">
              <h4>Chat</h4>
              <button onClick={() => setShowChat(false)}><X /></button>
            </div>
            <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-2">
              {chatMessages.map((msg, idx) => (
                <div key={idx} className="bg-gray-100 p-2 rounded">
                  <div className="text-sm font-semibold">{msg.senderName}</div>
                  <div>{msg.message}</div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t flex gap-2">
              <input
                className="flex-1 border p-2 rounded"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
              />
              <button onClick={sendChatMessage} className="bg-blue-600 text-white p-2 rounded">
                <Send />
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="bg-gray-900 p-4 flex justify-center gap-4">
        <button onClick={toggleAudio} className="p-2 rounded-full bg-gray-700">
          {isAudioEnabled ? <Mic /> : <MicOff />}
        </button>
        <button onClick={toggleVideo} className="p-2 rounded-full bg-gray-700">
          {isVideoEnabled ? <Video /> : <VideoOff />}
        </button>
        <button onClick={() => setShowChat(!showChat)} className="p-2 rounded-full bg-gray-700">
          <MessageSquare />
        </button>
        <button onClick={endCall} className="p-2 rounded-full bg-red-600">
          <Phone className="rotate-135" />
        </button>
      </div>
    </div>
  );
};

export default VideoCallPage;
