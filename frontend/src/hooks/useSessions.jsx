import { useState, useEffect, useCallback } from 'react';
import { userAxios } from '../utils/axios';

export const useSessions = () => {
  const [sessions, setSessions] = useState({
    upcoming: [],
    past: []
  });
  const [pagination, setPagination] = useState({
    upcoming: {
      count: 0,
      next: null,
      previous: null,
      currentPage: 1,
      totalPages: 1,
      hasMore: false
    },
    past: {
      count: 0,
      next: null,
      previous: null,
      currentPage: 1,
      totalPages: 1,
      hasMore: false
    }
  });
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState({
    upcoming: false,
    past: false
  });
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

  // Helper function to extract pagination info from response
  const extractPaginationInfo = useCallback((response, currentPage = 1) => {
    const { count, next, previous, results } = response.data;
    const pageSize = results?.length || 0;
    const totalPages = Math.ceil(count / (pageSize || 1));
    
    return {
      count: count || 0,
      next,
      previous,
      currentPage,
      totalPages,
      hasMore: !!next
    };
  }, []);

  // Fetch sessions from API with pagination
  const fetchSessions = useCallback(async (page = 1, append = false) => {
    try {
      if (!append) {
        setLoading(true);
      }
      setError(null);

      console.log('Fetching sessions...');

      // Fetch upcoming sessions
      const upcomingResponse = await userAxios.get('/list/', {
        params: {
          time_filter: 'upcoming',
          type: 'student',
          page: page
        }
      });

      // Fetch past sessions
      const pastResponse = await userAxios.get('/list/', {
        params: {
          time_filter: 'past',
          type: 'student',
          page: page
        }
      });

      console.log('Upcoming response:', upcomingResponse.data);
      console.log('Past response:', pastResponse.data);

      // Handle paginated response structure
      let upcomingData = [];
      let pastData = [];
      let upcomingPagination = {};
      let pastPagination = {};

      // Extract upcoming data and pagination info
      if (upcomingResponse.data.results) {
        upcomingData = upcomingResponse.data.results;
        upcomingPagination = extractPaginationInfo(upcomingResponse, page);
      } else if (upcomingResponse.data.success && upcomingResponse.data.data) {
        upcomingData = upcomingResponse.data.data;
        upcomingPagination = {
          count: upcomingData.length,
          next: null,
          previous: null,
          currentPage: 1,
          totalPages: 1,
          hasMore: false
        };
      } else if (Array.isArray(upcomingResponse.data)) {
        upcomingData = upcomingResponse.data;
        upcomingPagination = {
          count: upcomingData.length,
          next: null,
          previous: null,
          currentPage: 1,
          totalPages: 1,
          hasMore: false
        };
      }

      // Extract past data and pagination info
      if (pastResponse.data.results) {
        pastData = pastResponse.data.results;
        pastPagination = extractPaginationInfo(pastResponse, page);
      } else if (pastResponse.data.success && pastResponse.data.data) {
        pastData = pastResponse.data.data;
        pastPagination = {
          count: pastData.length,
          next: null,
          previous: null,
          currentPage: 1,
          totalPages: 1,
          hasMore: false
        };
      } else if (Array.isArray(pastResponse.data)) {
        pastData = pastResponse.data;
        pastPagination = {
          count: pastData.length,
          next: null,
          previous: null,
          currentPage: 1,
          totalPages: 1,
          hasMore: false
        };
      }

      console.log('Raw upcoming data:', upcomingData);
      console.log('Raw past data:', pastData);

      // Transform the data
      const transformedUpcoming = upcomingData.map(transformSessionData);
      const transformedPast = pastData.map(transformSessionData);

      console.log('Transformed upcoming:', transformedUpcoming);
      console.log('Transformed past:', transformedPast);

      // Update sessions (append if loading more, replace if fresh load)
      setSessions(prevSessions => ({
        upcoming: append ? [...prevSessions.upcoming, ...transformedUpcoming] : transformedUpcoming,
        past: append ? [...prevSessions.past, ...transformedPast] : transformedPast
      }));

      // Update pagination info
      setPagination({
        upcoming: upcomingPagination,
        past: pastPagination
      });

    } catch (err) {
      console.error('Error fetching sessions:', err);
      console.error('Error response:', err.response?.data);
      console.error('Error status:', err.response?.status);
      console.error('Error config:', err.config);
      setError(err.response?.data?.message || 'Failed to load sessions. Please try again later.');
    } finally {
      setLoading(false);
      setLoadingMore({ upcoming: false, past: false });
    }
  }, [transformSessionData, extractPaginationInfo]);

  // Load more sessions for a specific type
  const loadMoreSessions = useCallback(async (type) => {
    const currentPagination = pagination[type];
    if (!currentPagination.hasMore || loadingMore[type]) return;

    try {
      setLoadingMore(prev => ({ ...prev, [type]: true }));
      
      const nextPage = currentPagination.currentPage + 1;
      
      const response = await userAxios.get('/list/', {
        params: {
          time_filter: type,
          type: 'student',
          page: nextPage
        }
      });

      console.log(`Loading more ${type} sessions:`, response.data);

      let newData = [];
      let newPagination = {};

      if (response.data.results) {
        newData = response.data.results;
        newPagination = extractPaginationInfo(response, nextPage);
      } else if (response.data.success && response.data.data) {
        newData = response.data.data;
        newPagination = {
          count: currentPagination.count,
          next: null,
          previous: null,
          currentPage: nextPage,
          totalPages: currentPagination.totalPages,
          hasMore: false
        };
      } else if (Array.isArray(response.data)) {
        newData = response.data;
        newPagination = {
          count: currentPagination.count,
          next: null,
          previous: null,
          currentPage: nextPage,
          totalPages: currentPagination.totalPages,
          hasMore: false
        };
      }

      const transformedData = newData.map(transformSessionData);

      // Append new data to existing sessions
      setSessions(prevSessions => ({
        ...prevSessions,
        [type]: [...prevSessions[type], ...transformedData]
      }));

      // Update pagination info for this type
      setPagination(prevPagination => ({
        ...prevPagination,
        [type]: newPagination
      }));

    } catch (err) {
      console.error(`Error loading more ${type} sessions:`, err);
      setError(err.response?.data?.message || `Failed to load more ${type} sessions.`);
    } finally {
      setLoadingMore(prev => ({ ...prev, [type]: false }));
    }
  }, [pagination, loadingMore, transformSessionData, extractPaginationInfo]);

  // Cancel a session
  const cancelSession = useCallback(async (sessionId, reason = '') => {
    try {
      const response = await userAxios.patch(`/${sessionId}/cancel/`, { reason });
      if (response.data.success) {
        // Refresh sessions after cancellation
        await fetchSessions();
        return true;
      } else {
        throw new Error(response.data.message || 'Failed to cancel session');
      }
    } catch (err) {
      console.error('Error cancelling session:', err);
      throw new Error(err.response?.data?.error || err.response?.data?.message || 'Failed to cancel session');
    }
  }, [fetchSessions]);

  // Submit feedback for a session
  const submitFeedback = useCallback(async (sessionId, rating, feedback) => {
    try {
      const response = await userAxios.post(`/${sessionId}/reviews/create/`, {
        rating: rating,
        review_text: feedback,
        is_public: true
      });
  
      if (response.data.success) {
        // Refresh sessions to show updated feedback status
        await fetchSessions();
        return { success: true, message: 'Feedback submitted successfully!' };
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
    pagination,
    loading,
    loadingMore,
    error,
    fetchSessions,
    loadMoreSessions,
    cancelSession,
    submitFeedback,
    getSessionDetails,
    refetch: () => fetchSessions(1, false) // Reset to first page
  };
};