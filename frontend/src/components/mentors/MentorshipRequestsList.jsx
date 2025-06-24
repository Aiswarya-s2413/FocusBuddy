import React, { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import {useSimpleToast as useToast} from "../../components/ui/toast";
import { Calendar, Clock, MessageSquare, Video, Phone, MessageCircle, Play, ChevronDown, ChevronUp } from "lucide-react";
import axios from "axios";

// Create axios instance outside component to avoid re-initialization
const apiClient = axios.create({
  baseURL: "http://localhost:8000/api/mentor",
  withCredentials: true,
  timeout: 10000, // 10 second timeout
});

const MentorshipRequestsList = () => {
  const { toast } = useToast();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [startingSession, setStartingSession] = useState(null);
  const [showAll, setShowAll] = useState(false);
  
  // Use ref to track if component is mounted
  const isMountedRef = useRef(true);
  
  // Use ref to prevent multiple simultaneous requests
  const isRequestingRef = useRef(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Helper function to check if session is today or in the future
  const isSessionTodayOrFuture = (scheduledDate) => {
    if (!scheduledDate) return false;
    
    try {
      const sessionDate = new Date(scheduledDate);
      const today = new Date();
      
      // Set both dates to start of day for comparison
      sessionDate.setHours(0, 0, 0, 0);
      today.setHours(0, 0, 0, 0);
      
      return sessionDate >= today;
    } catch {
      return false;
    }
  };

  // Helper function to check if session can be started
  const canStartSession = (session) => {
    if (!session) return false;
    
    // Only allow starting if session is confirmed and scheduled for today or future
    return session.status === 'confirmed' && isSessionTodayOrFuture(session.scheduled_date);
  };

  // Function to handle starting a session
  const handleStartSession = async (sessionId) => {
    if (startingSession === sessionId) return; // Prevent double-clicking
    
    try {
      setStartingSession(sessionId);
      
      // API call to start the session
      const response = await apiClient.patch(`/mentor-sessions/${sessionId}/start/`);
      
      if (response.data) {
        // Update the session status in the local state
        setRequests(prevRequests => 
          prevRequests.map(request => 
            request.id === sessionId 
              ? { ...request, status: 'ongoing' }
              : request
          )
        );
        
        toast.success('Session started successfully!');
      }
    } catch (err) {
      console.error('Error starting session:', err);
      
      let errorMessage = 'Failed to start session';
      if (err.response?.status === 400) {
        errorMessage = 'Session cannot be started at this time';
      } else if (err.response?.status === 404) {
        errorMessage = 'Session not found';
      } else if (err.response?.status >= 500) {
        errorMessage = 'Server error. Please try again later.';
      }
      
      toast.error(errorMessage);
    } finally {
      setStartingSession(null);
    }
  };

  // Memoized fetch function - FIXED: Removed toast from dependencies
  const fetchMentorshipRequests = useCallback(async () => {
    // Prevent multiple simultaneous requests
    if (isRequestingRef.current || !isMountedRef.current) {
      return;
    }

    try {
      isRequestingRef.current = true;
      
      // Only update state if component is still mounted
      if (isMountedRef.current) {
        setLoading(true);
        setError(null);
      }

      const response = await apiClient.get('/mentor-sessions/');
      
      // Only update state if component is still mounted
      if (isMountedRef.current) {
        // Fix: Access the sessions array from the response
        const sessionsData = response.data?.sessions || response.data || [];
        
        // Ensure we have an array
        if (Array.isArray(sessionsData)) {
          setRequests(sessionsData);
        } else {
          console.warn('Expected array but got:', typeof sessionsData, sessionsData);
          setRequests([]);
        }
      }
    } catch (err) {
      console.error('Error fetching mentorship requests:', err);
      
      // Only update state if component is still mounted
      if (isMountedRef.current) {
        let errorMessage = 'Failed to load mentorship requests';
        
        if (err.code === 'ECONNABORTED') {
          errorMessage = 'Request timed out. Please check your connection.';
        } else if (err.response?.status === 401) {
          errorMessage = 'Authentication failed. Please log in again.';
        } else if (err.response?.status === 403) {
          errorMessage = 'Access denied. Check your permissions.';
        } else if (err.response?.status >= 500) {
          errorMessage = 'Server error. Please try again later.';
        } else if (!err.response) {
          errorMessage = 'Network error. Check your connection.';
        }
        
        setError(errorMessage);
        setRequests([]);
        
        // Only show toast if it's not a cancellation and component is mounted
        if (err.name !== 'CanceledError' && isMountedRef.current) {
          toast.error(errorMessage);
        }
      }
    } finally {
      isRequestingRef.current = false;
      
      // Only update loading state if component is still mounted
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, []); // FIXED: Empty dependency array

  // Effect to fetch data on mount
  useEffect(() => {
    fetchMentorshipRequests();
  }, [fetchMentorshipRequests]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'confirmed': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'ongoing': return 'bg-green-100 text-green-700 border-green-200';
      case 'completed': return 'bg-gray-100 text-gray-700 border-gray-200';
      case 'cancelled': return 'bg-red-100 text-red-700 border-red-200';
      case 'no_show': return 'bg-orange-100 text-orange-700 border-orange-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getSessionModeIcon = (mode) => {
    switch (mode) {
      case 'video': return <Video className="h-4 w-4" />;
      case 'voice': return <Phone className="h-4 w-4" />;
      case 'chat': return <MessageCircle className="h-4 w-4" />;
      default: return <Video className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Invalid Date';
    }
  };

  const formatTime = (timeString) => {
    if (!timeString) return 'N/A';
    try {
      return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return 'Invalid Time';
    }
  };

  const formatDuration = (minutes) => {
    if (!minutes || minutes <= 0) return 'N/A';
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${minutes}m`;
  };

  const handleRetry = () => {
    fetchMentorshipRequests();
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-500">Loading mentorship requests...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 text-red-300" />
            <p className="text-red-500 mb-4">{error}</p>
            <button 
              onClick={handleRetry}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
              disabled={isRequestingRef.current}
            >
              {isRequestingRef.current ? 'Retrying...' : 'Retry'}
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Mentorship Sessions ({requests.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {requests.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No mentorship sessions found</p>
            </div>
          ) : (
            <>
              {/* Show first 2 sessions or all if showAll is true */}
              {(showAll ? requests : requests.slice(0, 2)).map((session) => (
                <div key={session.id} className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">
                          {session.student?.name || session.student?.email || 'Unknown Student'}
                        </h4>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={getStatusColor(session.status)}>
                            {session.status?.charAt(0).toUpperCase() + session.status?.slice(1)}
                          </Badge>
                          {canStartSession(session) && (
                            <button
                              onClick={() => handleStartSession(session.id)}
                              disabled={startingSession === session.id}
                              className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Play className="h-3 w-3" />
                              {startingSession === session.id ? 'Starting...' : 'START'}
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {formatDate(session.scheduled_date)}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {formatTime(session.scheduled_time)}
                        </div>
                        <div className="flex items-center gap-1">
                          {getSessionModeIcon(session.session_mode)}
                          {session.session_mode?.charAt(0).toUpperCase() + session.session_mode?.slice(1)} 
                          ({formatDuration(session.duration_minutes)})
                        </div>
                      </div>

                      {session.subjects && session.subjects.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {session.subjects.map((subject, index) => (
                            <Badge key={index} variant="outline" className="bg-purple-100 text-purple-700 text-xs">
                              {subject.name || subject}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {session.session_notes && (
                        <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                          <strong>Notes:</strong> {session.session_notes}
                        </p>
                      )}

                      {session.meeting_link && session.status === 'confirmed' && (
                        <div className="text-sm">
                          <a 
                            href={session.meeting_link} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 underline"
                          >
                            Join Meeting
                          </a>
                          {session.meeting_id && (
                            <span className="text-gray-500 ml-2">
                              (ID: {session.meeting_id})
                            </span>
                          )}
                        </div>
                      )}

                      <div className="text-xs text-gray-400">
                        Created: {formatDate(session.created_at)}
                        {session.confirmed_at && (
                          <span className="ml-4">
                            Confirmed: {formatDate(session.confirmed_at)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Show/Hide button if there are more than 2 sessions */}
              {requests.length > 2 && (
                <div className="flex justify-center pt-4">
                  <button
                    onClick={() => setShowAll(!showAll)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors border border-gray-200"
                  >
                    {showAll ? (
                      <>
                        <ChevronUp className="h-4 w-4" />
                        Show Less ({requests.length - 2} hidden)
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4" />
                        Show More ({requests.length - 2} more)
                      </>
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MentorshipRequestsList;