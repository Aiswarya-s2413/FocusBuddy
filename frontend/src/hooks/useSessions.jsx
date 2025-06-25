import { useState, useEffect, useCallback } from 'react';
import { userAxios } from '../utils/axios';

export const useSessions = () => {
  const [sessions, setSessions] = useState({
    upcoming: [],
    past: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Transform backend data to match component expectations
  const transformSessionData = useCallback((sessionData) => {
    console.log('Transforming session data:', sessionData);
    
    return {
      id: sessionData.id,
      dateTime: sessionData.session_datetime,
      mode: sessionData.session_mode,
      duration: `${sessionData.duration_minutes} minutes`,
      status: sessionData.status,
      meetingLink: sessionData.meeting_link,
      meetingId: sessionData.meeting_id,
      meetingPassword: sessionData.meeting_password,
      mentor: {
        name: sessionData.mentor_name,
        specialization: sessionData.subjects_data?.map(s => s.name).join(', ') || 'General Mentoring',
        profilePicture: sessionData.mentor_profile_image
      },
      feedbackProvided: !!sessionData.student_rating,
      rating: sessionData.student_rating,
      feedback: sessionData.student_feedback,
      subjects: sessionData.subjects_data || [],
      createdAt: sessionData.created_at,
      updatedAt: sessionData.updated_at,
      // Additional fields from backend
      scheduledDate: sessionData.scheduled_date,
      scheduledTime: sessionData.scheduled_time,
      isUpcoming: sessionData.is_upcoming
    };
  }, []);

  // Fetch sessions from API
  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Fetching sessions...');

      // Fetch upcoming sessions
      const upcomingResponse = await userAxios.get('/list/', {
        params: {
          time_filter: 'upcoming',
          type: 'student'
        }
      });

      // Fetch past sessions
      const pastResponse = await userAxios.get('/list/', {
        params: {
          time_filter: 'past',
          type: 'student'
        }
      });

      console.log('Upcoming response:', upcomingResponse.data);
      console.log('Past response:', pastResponse.data);

      // Handle paginated or non-paginated responses
      let upcomingData = [];
      let pastData = [];

      // Check for paginated response structure
      if (upcomingResponse.data.results) {
        upcomingData = upcomingResponse.data.results;
      } else if (upcomingResponse.data.success && upcomingResponse.data.data) {
        upcomingData = upcomingResponse.data.data;
      } else if (Array.isArray(upcomingResponse.data)) {
        upcomingData = upcomingResponse.data;
      }

      if (pastResponse.data.results) {
        pastData = pastResponse.data.results;
      } else if (pastResponse.data.success && pastResponse.data.data) {
        pastData = pastResponse.data.data;
      } else if (Array.isArray(pastResponse.data)) {
        pastData = pastResponse.data;
      }

      console.log('Raw upcoming data:', upcomingData);
      console.log('Raw past data:', pastData);

      // Transform the data
      const transformedUpcoming = upcomingData.map(transformSessionData);
      const transformedPast = pastData.map(transformSessionData);

      console.log('Transformed upcoming:', transformedUpcoming);
      console.log('Transformed past:', transformedPast);

      setSessions({
        upcoming: transformedUpcoming,
        past: transformedPast
      });

    } catch (err) {
      console.error('Error fetching sessions:', err);
      console.error('Error response:', err.response?.data);
      console.error('Error status:', err.response?.status);
      console.error('Error config:', err.config);
      setError(err.response?.data?.message || 'Failed to load sessions. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [transformSessionData]);

  // Cancel a session
  const cancelSession = useCallback(async (sessionId) => {
    try {
      const response = await userAxios.patch(`/sessions/${sessionId}/`, {
        status: 'cancelled',
        cancellation_reason: 'Cancelled by student'
      });

      if (response.data.success) {
        // Refresh sessions after cancellation
        await fetchSessions();
        return true;
      } else {
        throw new Error(response.data.message || 'Failed to cancel session');
      }
    } catch (err) {
      console.error('Error cancelling session:', err);
      throw new Error(err.response?.data?.message || 'Failed to cancel session');
    }
  }, [fetchSessions]);

  // Submit feedback for a session
  const submitFeedback = useCallback(async (sessionId, rating, feedback) => {
    try {
      const response = await userAxios.patch(`/sessions/${sessionId}/`, {
        student_rating: rating,
        student_feedback: feedback
      });

      if (response.data.success) {
        // Refresh sessions after feedback submission
        await fetchSessions();
        return true;
      } else {
        throw new Error(response.data.message || 'Failed to submit feedback');
      }
    } catch (err) {
      console.error('Error submitting feedback:', err);
      throw new Error(err.response?.data?.message || 'Failed to submit feedback');
    }
  }, [fetchSessions]);

  // Get session details by ID
  const getSessionDetails = useCallback(async (sessionId) => {
    try {
      const response = await userAxios.get(`/sessions/${sessionId}/`);
      
      if (response.data.success) {
        return transformSessionData(response.data.data);
      } else {
        throw new Error(response.data.message || 'Failed to fetch session details');
      }
    } catch (err) {
      console.error('Error fetching session details:', err);
      throw new Error(err.response?.data?.message || 'Failed to fetch session details');
    }
  }, [transformSessionData]);

  // Load sessions on hook initialization
  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  return {
    sessions,
    loading,
    error,
    fetchSessions,
    cancelSession,
    submitFeedback,
    getSessionDetails,
    refetch: fetchSessions
  };
};