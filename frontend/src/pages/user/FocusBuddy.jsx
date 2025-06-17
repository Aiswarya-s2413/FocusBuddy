import React, { useState, useEffect, useRef } from "react";
import { Button } from "../../components/ui/button";
import { Label } from "../../components/ui/label";
import { 
  Video, 
  Mic, 
  MicOff, 
  Users, 
  MessageCircle, 
  X, 
  Search, 
  Clock,
  Heart,
  Send
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
  DialogFooter
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
import { userAxios } from "../../utils/axios";

function FocusBuddy() {
  // State management
  const [availability, setAvailability] = useState(null);
  const [currentSession, setCurrentSession] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [matchFound, setMatchFound] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [focusLength, setFocusLength] = useState("25");
  const [focusType, setFocusType] = useState("study");
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [timeRemaining, setTimeRemaining] = useState(null);
  
  // Refs
  const searchIntervalRef = useRef(null);
  const sessionIntervalRef = useRef(null);
  const messageIntervalRef = useRef(null);

  // Fetch initial availability status
  useEffect(() => {
    fetchAvailability();
    checkCurrentSession();
  }, []);

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      if (searchIntervalRef.current) clearInterval(searchIntervalRef.current);
      if (sessionIntervalRef.current) clearInterval(sessionIntervalRef.current);
      if (messageIntervalRef.current) clearInterval(messageIntervalRef.current);
    };
  }, []);

  // Session timer effect
  useEffect(() => {
    if (currentSession && sessionStarted && currentSession.expires_at) {
      const updateTimer = () => {
        const now = new Date();
        const expiresAt = new Date(currentSession.expires_at);
        const remaining = Math.max(0, Math.floor((expiresAt - now) / 1000));
        setTimeRemaining(remaining);
        
        if (remaining === 0) {
          handleSessionExpired();
        }
      };
      
      updateTimer();
      sessionIntervalRef.current = setInterval(updateTimer, 1000);
      
      return () => {
        if (sessionIntervalRef.current) {
          clearInterval(sessionIntervalRef.current);
        }
      };
    }
  }, [currentSession, sessionStarted]);

  // Format time remaining
  const formatTime = (seconds) => {
    if (seconds === null) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // API calls
  const fetchAvailability = async () => {
    try {
      const response = await userAxios.get('/availability/');
      setAvailability(response.data);
    } catch (error) {
      console.error('Error fetching availability:', error);
    }
  };

  const checkCurrentSession = async () => {
    try {
      const response = await userAxios.get('/current-session/');
      setCurrentSession(response.data);
      
      if (response.data.status === 'matched') {
        setMatchFound(true);
      } else if (response.data.status === 'active') {
        setSessionStarted(true);
        setMatchFound(false);
        fetchMessages(response.data.id);
      } else if (response.data.status === 'matching') {
        setIsSearching(true);
        startSearchPolling();
      }
    } catch (error) {
      if (error.response?.status === 404) {
        // No active session
        setCurrentSession(null);
      } else {
        console.error('Error checking current session:', error);
      }
    }
  };

  const updateAvailability = async (isAvailable, durationMinutes = null) => {
    try {
      setLoading(true);
      const data = { 
        is_available: isAvailable,
        ...(durationMinutes && { duration_minutes: parseInt(durationMinutes) })
      };
      
      const response = await userAxios.post('/availability/', data);
      setAvailability(response.data);
      setError("");
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to update availability');
      console.error('Error updating availability:', error);
    } finally {
      setLoading(false);
    }
  };

  const startFocusSession = async () => {
    try {
      setLoading(true);
      const response = await userAxios.post('/start-session/', {
        session_type: focusType,
        duration_minutes: parseInt(focusLength)
      });
      
      setCurrentSession(response.data.session);
      
      if (response.data.match_found) {
        setMatchFound(true);
        setIsSearching(false);
      } else {
        setIsSearching(true);
        startSearchPolling();
      }
      
      setError("");
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to start session');
      console.error('Error starting session:', error);
    } finally {
      setLoading(false);
    }
  };

  const acceptMatch = async () => {
    try {
      setLoading(true);
      const response = await userAxios.post('/match-response/', {
        session_id: currentSession.id,
        action: 'accept'
      });
      
      setCurrentSession(response.data.session);
      setMatchFound(false);
      setSessionStarted(true);
      fetchMessages(response.data.session.id);
      setError("");
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to accept match');
      console.error('Error accepting match:', error);
    } finally {
      setLoading(false);
    }
  };

  const declineMatch = async () => {
    try {
      setLoading(true);
      await userAxios.post('/match-response/', {
        session_id: currentSession.id,
        action: 'decline'
      });
      
      setCurrentSession(null);
      setMatchFound(false);
      setIsSearching(false);
      await updateAvailability(false);
      setError("");
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to decline match');
      console.error('Error declining match:', error);
    } finally {
      setLoading(false);
    }
  };

  const endSession = async () => {
    try {
      setLoading(true);
      await userAxios.post('/end-session/');
      setCurrentSession(null);
      setSessionStarted(false);
      setMessages([]);
      setTimeRemaining(null);
      await updateAvailability(false);
      setError("");
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to end session');
      console.error('Error ending session:', error);
    } finally {
      setLoading(false);
    }
  };

  const cancelSession = async () => {
    try {
      setLoading(true);
      await userAxios.post('/cancel-session/');
      
      setCurrentSession(null);
      setIsSearching(false);
      setMatchFound(false);
      setSessionStarted(false);
      setMessages([]);
      await updateAvailability(false);
      setError("");
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to cancel session');
      console.error('Error canceling session:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (sessionId) => {
    try {
      const response = await userAxios.get(`/sessions/${sessionId}/messages/`);
      setMessages(response.data);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !currentSession) return;
    
    try {
      await userAxios.post(`/sessions/${currentSession.id}/messages/`, {
        message: newMessage.trim()
      });
      
      setNewMessage("");
      fetchMessages(currentSession.id);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const startSearchPolling = () => {
    if (searchIntervalRef.current) {
      clearInterval(searchIntervalRef.current);
    }
    
    searchIntervalRef.current = setInterval(async () => {
      try {
        const response = await userAxios.get('/current-session/');
        if (response.data.status === 'matched') {
          setCurrentSession(response.data);
          setMatchFound(true);
          setIsSearching(false);
          clearInterval(searchIntervalRef.current);
        }
      } catch (error) {
        if (error.response?.status === 404) {
          // Session ended/cancelled
          setIsSearching(false);
          clearInterval(searchIntervalRef.current);
        }
      }
    }, 2000);
  };

  const handleSessionExpired = async () => {
    setSessionStarted(false);
    setCurrentSession(null);
    setTimeRemaining(null);
    await updateAvailability(false);
  };

  const handleAvailabilityChange = async () => {
    if (availability?.is_available) {
      // Turning off availability
      await updateAvailability(false);
      if (currentSession && !sessionStarted) {
        await cancelSession();
      }
    } else {
      // Turning on availability and starting session
      await updateAvailability(true, parseInt(focusLength));
      await startFocusSession();
    }
  };

  // Start message polling when session starts
  useEffect(() => {
    if (sessionStarted && currentSession) {
      messageIntervalRef.current = setInterval(() => {
        fetchMessages(currentSession.id);
      }, 5000);
      
      return () => {
        if (messageIntervalRef.current) {
          clearInterval(messageIntervalRef.current);
        }
      };
    }
  }, [sessionStarted, currentSession]);

  return (
    <div className="min-h-screen bg-[#F8F6FB]">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-[#6E59A5] mb-6">Find a Focus Buddy</h1>
        
        {/* Error Display */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        {/* Availability Section */}
        <div className="bg-white p-6 rounded-xl shadow-sm mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-[#6E59A5] mb-2">Your Availability</h2>
              <p className="text-gray-600">Toggle ON to mark yourself available for focus sessions</p>
            </div>
            <div className="flex items-center space-x-3">
              <span className={`text-sm font-medium ${availability?.is_available ? 'text-[#9b87f5]' : 'text-gray-500'}`}>
                {availability?.is_available ? '🟣 Available' : '⚫ Not Available'}
              </span>
              <Toggle 
                pressed={availability?.is_available || false} 
                onPressedChange={handleAvailabilityChange}
                disabled={loading}
                className={`${availability?.is_available ? 'bg-[#9b87f5]' : 'bg-gray-200'} hover:bg-[#7E69AB]`}
              />
            </div>
          </div>
          
          {(availability?.is_available || isSearching) && (
            <div className="mt-6 pt-6 border-t border-gray-100">
              <div className="mb-4">
                <Label htmlFor="focus-length" className="text-sm font-medium text-gray-700 mb-2 block">
                  Focus Session Length
                </Label>
                <ToggleGroup 
                  type="single" 
                  value={focusLength} 
                  onValueChange={(val) => val && setFocusLength(val)} 
                  className="flex space-x-2 mt-1"
                  disabled={isSearching || sessionStarted}
                >
                  <ToggleGroupItem value="15" className="border border-[#D6BCFA] text-[#7E69AB] data-[state=on]:bg-[#9b87f5] data-[state=on]:text-white">
                    15 min
                  </ToggleGroupItem>
                  <ToggleGroupItem value="25" className="border border-[#D6BCFA] text-[#7E69AB] data-[state=on]:bg-[#9b87f5] data-[state=on]:text-white">
                    25 min
                  </ToggleGroupItem>
                  <ToggleGroupItem value="50" className="border border-[#D6BCFA] text-[#7E69AB] data-[state=on]:bg-[#9b87f5] data-[state=on]:text-white">
                    50 min
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
            </div>
          )}
        </div>
        
        {/* Searching State */}
        {isSearching && (
          <div className="bg-white p-8 rounded-xl shadow-sm mb-8 text-center">
            <div className="mb-4">
              <div className="animate-pulse inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#F0EBFF]">
                <Search className="h-8 w-8 text-[#9b87f5]" />
              </div>
            </div>
            <h3 className="text-xl font-semibold text-[#6E59A5] mb-2">Searching for a focus buddy...</h3>
            <p className="text-gray-600 mb-4">This usually takes less than a minute</p>
            <Button 
              variant="outline" 
              className="border-[#9b87f5] text-[#9b87f5] hover:bg-[#F8F6FB]"
              onClick={cancelSession}
              disabled={loading}
            >
              <X className="mr-2 h-4 w-4" /> Cancel Search
            </Button>
          </div>
        )}
        
        {/* Match Found Dialog */}
        <Dialog open={matchFound} onOpenChange={() => {}}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-center text-[#6E59A5]">
                🎉 You've been matched!
              </DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center py-6">
              <Avatar className="h-20 w-20 mb-4 border-2 border-[#9b87f5]">
                <AvatarImage src={currentSession?.other_user?.profile_picture} />
                <AvatarFallback className="bg-[#F0EBFF] text-[#7E69AB] text-lg">
                  {currentSession?.other_user?.name?.charAt(0) || 'FB'}
                </AvatarFallback>
              </Avatar>
              <h3 className="text-lg font-medium mb-1">
                {currentSession?.other_user?.name || 'FocusFriend'}
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Focus Goal: {focusType.charAt(0).toUpperCase() + focusType.slice(1)} • {currentSession?.duration_minutes || focusLength} min
              </p>
              {currentSession?.common_subjects?.length > 0 && (
                <div className="text-xs text-gray-600 mb-4">
                  Common subjects: {currentSession.common_subjects.map(s => s.name).join(', ')}
                </div>
              )}
            </div>
            <DialogFooter className="flex sm:justify-center flex-row gap-3">
              <Button 
                variant="outline" 
                className="border-[#9b87f5] text-[#9b87f5] hover:bg-[#F8F6FB]"
                onClick={declineMatch}
                disabled={loading}
              >
                Decline
              </Button>
              <Button 
                className="bg-[#9b87f5] hover:bg-[#7E69AB] text-white"
                onClick={acceptMatch}
                disabled={loading}
              >
                Accept & Start
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Active Session */}
        {sessionStarted && currentSession && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-8">
            <div className="bg-[#F0EBFF] p-4 flex justify-between items-center">
              <div className="flex items-center">
                <Avatar className="h-10 w-10 mr-3">
                  <AvatarImage src={currentSession.other_user?.profile_picture} />
                  <AvatarFallback className="bg-[#9b87f5] text-white">
                    {currentSession.other_user?.name?.charAt(0) || 'FB'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-medium text-[#6E59A5]">
                    {currentSession.other_user?.name || 'FocusFriend'}
                  </h3>
                  <p className="text-xs text-gray-600">
                    Focus Session: {currentSession.duration_minutes} min
                  </p>
                </div>
              </div>
              <div className="text-2xl font-light text-[#7E69AB]">
                {formatTime(timeRemaining)}
              </div>
            </div>
            
            <div className="p-2 md:p-6">
              {/* Video area */}
              <div className="relative bg-gray-900 h-[350px] md:h-[450px] rounded-lg overflow-hidden mb-4 flex items-center justify-center">
                {isVideoOn ? (
                  <div className="text-gray-400">Your video will appear here</div>
                ) : (
                  <div className="text-center">
                    <Video className="h-12 w-12 mx-auto mb-2 text-gray-600" />
                    <p className="text-gray-400">Video Off</p>
                  </div>
                )}
              </div>
              
              {/* Controls */}
              <div className="flex flex-wrap justify-between items-center">
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    className={`${isVideoOn ? 'border-[#9b87f5] text-[#9b87f5]' : 'bg-red-100 border-red-300 text-red-500'} hover:bg-[#F8F6FB]`}
                    onClick={() => setIsVideoOn(!isVideoOn)}
                  >
                    <Video className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    className={`${isAudioOn ? 'border-[#9b87f5] text-[#9b87f5]' : 'bg-red-100 border-red-300 text-red-500'} hover:bg-[#F8F6FB]`}
                    onClick={() => setIsAudioOn(!isAudioOn)}
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
                          {messages.map((msg, index) => (
                            <p key={index} className="mb-1">
                              <strong>{msg.sender_name}:</strong> {msg.message}
                            </p>
                          ))}
                        </div>
                        <div className="flex space-x-2">
                          <input 
                            type="text"
                            className="flex-1 rounded border border-gray-200 px-3 py-1 text-sm"
                            placeholder="Type a message..."
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                          />
                          <Button 
                            size="sm" 
                            className="bg-[#9b87f5] hover:bg-[#7E69AB]"
                            onClick={sendMessage}
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="flex space-x-2 mt-3 sm:mt-0">
                  <Button 
                    variant="outline" 
                    className="border-[#9b87f5] text-[#9b87f5] hover:bg-[#F8F6FB]"
                  >
                    <Heart className="h-4 w-4 mr-1" /> Clap
                  </Button>
                  <Button 
                    className="bg-[#9b87f5] hover:bg-[#7E69AB] text-white"
                    onClick={endSession}
                    disabled={loading}
                  >
                    End Session
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* No Session State */}
        {!availability?.is_available && !isSearching && !sessionStarted && !matchFound && (
          <div className="bg-white p-8 rounded-xl shadow-sm mb-8 text-center">
            <div className="mb-6">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[#F0EBFF]">
                <Users className="h-10 w-10 text-[#9b87f5]" />
              </div>
            </div>
            <h3 className="text-2xl font-semibold text-[#6E59A5] mb-3">Ready to start focusing?</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Toggle your availability to find a focus buddy. Connect with someone to stay motivated and accountable!
            </p>
            <Button 
              className="bg-[#9b87f5] hover:bg-[#7E69AB] text-white"
              onClick={handleAvailabilityChange}
              disabled={loading}
            >
              <Users className="mr-2 h-4 w-4" /> Find a Focus Buddy
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default FocusBuddy;