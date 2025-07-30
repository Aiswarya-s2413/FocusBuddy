import React, { useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../ui/button";
import { Card, CardContent, CardFooter } from "../ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Calendar, Clock, Video, X, MessageSquare, Star, Loader2, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../ui/dialog";
import { useSimpleToast } from "../ui/toast";
import { userAxios } from "../../utils/axios"; 

const Avatar = ({ children, className = "" }) => (
  <div className={`rounded-full bg-gray-200 flex items-center justify-center ${className}`}>
    {children}
  </div>
);

const AvatarImage = ({ src, alt, className = "" }) => {
  const [imageError, setImageError] = useState(false);
  
  if (!src) return null;

  let fixedSrc = src;
  
  // Handle different URL formats
  if (src.includes('cloudinary.com')) {
    if (src.includes('/v1/')) {
      fixedSrc = src.replace('/v1/', '/v1749732168/');
      if (fixedSrc.endsWith('.jpg') && !fixedSrc.endsWith('.jpg.jpg')) {
        fixedSrc = fixedSrc + '.jpg';
      }
    } else {
      fixedSrc = src;
    }
  } else if (src.startsWith('mentors/') || src.includes('/')) {
    const cleanPath = src.startsWith('/') ? src.substring(1) : src;
    let finalPath = cleanPath;
    if (cleanPath.includes('mentors/') && cleanPath.endsWith('.jpg') && !cleanPath.endsWith('.jpg.jpg')) {
      finalPath = `${cleanPath}.jpg`;
    } else if (!cleanPath.includes('.')) {
      finalPath = `${cleanPath}.jpg`;
    }
    fixedSrc = `https://res.cloudinary.com/dnq1fzs1l/image/upload/v1749732168/${finalPath}`;
  }
  
  const defaultImage = "https://via.placeholder.com/150/cccccc/666666?text=No+Image";
  const imageSrc = imageError ? defaultImage : fixedSrc;
  
  return (
    <img 
      src={imageSrc} 
      alt={alt || "Avatar"} 
      className={`w-full h-full object-cover rounded-full ${className}`}
      onError={(e) => {
        console.log('Image failed to load:', e.target.src);
        if (!imageError) {
          setImageError(true);
        }
      }}
    />
  );
};

const AvatarFallback = ({ children, className = "" }) => (
  <div className={`text-gray-600 font-medium ${className}`}>{children}</div>
);

// Pagination Component
const PaginationControls = ({ pagination, onLoadMore, loadingMore, type }) => {
  if (!pagination.hasMore) return null;

  return (
    <div className="flex justify-center mt-6">
      <Button
        variant="outline"
        onClick={() => onLoadMore(type)}
        disabled={loadingMore}
        className="px-6 py-2"
      >
        {loadingMore ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Loading more...
          </>
        ) : (
          <>
            Load More Sessions
            <ChevronRight className="h-4 w-4 ml-2" />
          </>
        )}
      </Button>
    </div>
  );
};

// Pagination Info Component
const PaginationInfo = ({ pagination, type }) => {
  if (!pagination.count) return null;

  const displayedCount = pagination.currentPage * (pagination.count / pagination.totalPages);
  const actualDisplayedCount = Math.min(displayedCount, pagination.count);

  return (
    <div className="text-sm text-gray-500 text-center mb-4">
      {pagination.count} {type} sessions
    </div>
  );
};

const MySessionsTab = ({ sessions, pagination, onCancelSession, onSubmitFeedback, onRefresh, onLoadMore, loadingMore }) => {
  const { toast, ToastContainer } = useSimpleToast();
  const navigate = useNavigate();
  const [cancelDialog, setCancelDialog] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [feedbackDialog, setFeedbackDialog] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  
  // Local state to track feedback updates without rerendering
  const [localFeedbackUpdates, setLocalFeedbackUpdates] = useState({});
  // --- Report Mentor State ---
  const [reportedSessions, setReportedSessions] = useState({}); // sessionId: true

  const handleCancelSession = async () => {
    if (!selectedSession || !onCancelSession) return;
    
    try {
      setIsCancelling(true);
      await onCancelSession(selectedSession.id);
      toast.success('Session cancelled'); // Changed message as requested
      setCancelDialog(false);
      setSelectedSession(null);
    } catch (error) {
      toast.error(error.message || 'Failed to cancel session.');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleSubmitFeedback = async () => {
    if (!selectedSession || feedbackRating === 0) {
      toast.error('Please provide a rating before submitting.');
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      const feedbackData = {
        rating: feedbackRating,
        review_text: feedbackComment.trim() || null,
        is_public: true
      };

      const response = await userAxios.post(
        `${selectedSession.id}/reviews/create/`,
        feedbackData
      );

      if (response.data.success) {
        // Update local state without triggering parent refresh
        setLocalFeedbackUpdates(prev => ({
          ...prev,
          [selectedSession.id]: {
            feedbackProvided: true,
            rating: feedbackRating,
            feedback: feedbackComment
          }
        }));

        toast.success(`Thank you for your feedback! You rated ${selectedSession.mentor.name} ${feedbackRating} star${feedbackRating > 1 ? 's' : ''}.`);
        
        // Only call parent callback if provided (without triggering refresh)
        if (onSubmitFeedback) {
          // Don't await this to prevent blocking UI updates
          onSubmitFeedback(selectedSession.id, feedbackRating, feedbackComment);
        }
        
        // Close dialog and reset state
        setFeedbackDialog(false);
        setSelectedSession(null);
        setFeedbackRating(0);
        setFeedbackComment('');
        
        // DON'T call onRefresh() to prevent rerender
        
      } else {
        throw new Error(response.data.message || 'Failed to submit feedback');
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      
      if (error.response?.status === 404) {
        toast.error('Session not found. Please try again later.');
      } else if (error.response?.status === 400) {
        const errorMessages = error.response?.data?.errors;
        if (errorMessages) {
          const firstError = Object.values(errorMessages)[0];
          toast.error(Array.isArray(firstError) ? firstError[0] : firstError);
        } else {
          toast.error('Please check your feedback and try again.');
        }
      } else if (error.response?.status === 401) {
        toast.error('You must be logged in to submit feedback.');
      } else if (error.response?.status === 409) {
        toast.warning('You have already submitted feedback for this session.');
      } else {
        toast.error('Unable to submit feedback. Please try again later.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const openFeedbackDialog = useCallback((session) => {
    setSelectedSession(session);
    setFeedbackRating(session.rating || 0);
    setFeedbackComment(session.feedback || '');
    setFeedbackDialog(true);
  }, []);

  const formatDateTime = useCallback((dateTimeString) => {
    if (!dateTimeString) return { date: 'N/A', time: 'N/A' };
    
    const dateTime = new Date(dateTimeString);
    return {
      date: dateTime.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      }),
      time: dateTime.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })
    };
  }, []);

  const getSessionModeIcon = useCallback((mode) => {
    switch (mode?.toLowerCase()) {
      case 'video':
        return <Video className="h-4 w-4 mr-2 text-gray-500" />;
      case 'voice':
        return <Video className="h-4 w-4 mr-2 text-gray-500" />;
      case 'chat':
        return <MessageSquare className="h-4 w-4 mr-2 text-gray-500" />;
      default:
        return <Video className="h-4 w-4 mr-2 text-gray-500" />;
    }
  }, []);

  const canCancelSession = useCallback((session) => {
    if (session.status === 'cancelled' || session.status === 'completed' || session.status === 'ongoing') {
      return false;
    }
    
    const sessionTime = new Date(session.dateTime);
    const now = new Date();
    const hoursUntilSession = (sessionTime - now) / (1000 * 60 * 60);
    
    return hoursUntilSession > 1;
  }, []);

  const canJoinSession = useCallback((session) => {
    if (session.status === 'ongoing') {
      return true;
    }
    
    if (session.status !== 'confirmed') {
      return false;
    }
    
    const sessionTime = new Date(session.dateTime);
    const now = new Date();
    const minutesUntilSession = (sessionTime - now) / (1000 * 60);
    
    return minutesUntilSession <= 15 && minutesUntilSession >= -60;
  }, []);

  const handleJoinSession = useCallback((session) => {
    toast.success(`Joining session with ${session.mentor.name}...`);
    console.log('Joining session:', session);
    // Navigate to video call page
    navigate(`/video-call/${session.id}`);
  }, [toast, navigate]);

  const getJoinButtonText = useCallback((session) => {
    if (session.status === 'ongoing') {
      return 'Join Session';
    }
    
    if (session.status === 'confirmed') {
      const sessionTime = new Date(session.dateTime);
      const now = new Date();
      const minutesUntilSession = (sessionTime - now) / (1000 * 60);
      
      if (minutesUntilSession <= 0) {
        return 'Join Session';
      } else if (minutesUntilSession <= 15) {
        return `Join in ${Math.ceil(minutesUntilSession)}min`;
      }
    }
    
    return 'Join Session';
  }, []);

  const getStatusBadgeColor = useCallback((status) => {
    switch (status) {
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'ongoing': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }, []);

  const handleLoadMore = useCallback((type) => {
    if (onLoadMore && !loadingMore[type]) {
      onLoadMore(type);
    }
  }, [onLoadMore, loadingMore]);

  // Memoize enhanced sessions with local feedback updates
  const enhancedSessions = useMemo(() => ({
    upcoming: sessions.upcoming,
    past: sessions.past.map(session => ({
      ...session,
      ...(localFeedbackUpdates[session.id] || {})
    }))
  }), [sessions, localFeedbackUpdates]);

  // --- Report Mentor Handlers ---
  const handleSubmitReport = async () => {
    if (!selectedSession) return;
    setIsReporting(true);
    try {
      await userAxios.post('/api/user/mentor-report/', {
        mentor: selectedSession.mentor.id || selectedSession.mentor.mentor_id || selectedSession.mentor.mentorId,
        session: selectedSession.id,
        reason: reportReason.trim(),
      });
      setReportedSessions(prev => ({ ...prev, [selectedSession.id]: true }));
      toast.success('Report submitted successfully.');
      setReportDialog(false);
      setSelectedSession(null);
      setReportReason('');
    } catch (error) {
      if (error.response?.data?.error?.includes('already reported')) {
        setReportedSessions(prev => ({ ...prev, [selectedSession.id]: true }));
        toast.warning('You have already reported this mentor for this session.');
      } else {
        toast.error(error.response?.data?.error || 'Failed to submit report.');
      }
    } finally {
      setIsReporting(false);
    }
  };

  // Render session card
  const renderSessionCard = (session, isPast = false) => {
    const { date, time } = formatDateTime(session.dateTime);
    
    return (
      <Card key={session.id}>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <Avatar className="h-12 w-12 border-2 border-purple-100">
              <AvatarImage 
                src={session.mentor.profilePicture || session.mentor.profile_image_url} 
                alt={session.mentor.name}
              />
            </Avatar>
            <div className="flex-1">
              <h3 className="font-medium">{session.mentor.name}</h3>
              <p className="text-sm text-gray-600">{session.mentor.specialization}</p>
              
              {session.status && !isPast && (
                <span className={`inline-block px-2 py-1 text-xs rounded-full mt-1 ${getStatusBadgeColor(session.status)}`}>
                  {session.status === 'ongoing' ? 'Live Now' : 
                   session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                </span>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                <div className="flex items-center text-sm">
                  <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                  <span>{date}</span>
                </div>
                <div className="flex items-center text-sm">
                  <Clock className="h-4 w-4 mr-2 text-gray-500" />
                  <span>{time}</span>
                </div>
                <div className="flex items-center text-sm">
                  Paid:
                  <span className="capitalize">Rs.{session?.payment}</span>
                </div>
                <div className="flex items-center text-sm">
                  <Clock className="h-4 w-4 mr-2 text-gray-500" />
                  <span>{session.duration}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between bg-gray-50 border-t px-6 py-3">
          {!isPast ? (
            <>
              {canCancelSession(session) && (
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSelectedSession(session);
                    setCancelDialog(true);
                  }}
                >
                  Cancel
                </Button>
              )}
              
              <div className="flex-1"></div>
              
              <Button 
                variant="default" 
                className={`${canJoinSession(session) 
                  ? (session.status === 'ongoing' 
                    ? 'bg-green-600 hover:bg-green-700 animate-pulse' 
                    : 'bg-purple-600 hover:bg-purple-700')
                  : 'bg-gray-400 cursor-not-allowed'
                }`}
                onClick={() => handleJoinSession(session)}
                disabled={!canJoinSession(session)}
              >
                {canJoinSession(session) ? (
                  <>
                    <ExternalLink className="h-4 w-4 mr-1" />
                    {getJoinButtonText(session)}
                  </>
                ) : (
                  'Session Not Ready'
                )}
              </Button>
            </>
          ) : (
            <div className="flex flex-col sm:flex-row justify-end w-full gap-2">
              {!session.feedbackProvided ? (
                <Button
                  variant="outline"
                  onClick={() => openFeedbackDialog(session)}
                >
                  <MessageSquare className="h-4 w-4 mr-1" /> Leave Feedback
                </Button>
              ) : (
                <div className="flex items-center text-sm text-gray-500 mr-2">
                  <span className="mr-1">Your rating:</span>
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star 
                        key={i} 
                        className={`h-4 w-4 ${
                          i < session.rating 
                            ? "text-yellow-500 fill-yellow-500" 
                            : "text-gray-300"
                        }`} 
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardFooter>
      </Card>
    );
  };

  return (
    <>
      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList className="grid grid-cols-2 mb-6">
          <TabsTrigger value="upcoming">Upcoming Sessions</TabsTrigger>
          <TabsTrigger value="past">Past Sessions</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming">
          {pagination?.upcoming && (
            <PaginationInfo pagination={pagination.upcoming} type="upcoming" />
          )}
          
          {enhancedSessions.upcoming.length === 0 ? (
            <div className="text-center py-10">
              <h3 className="text-gray-500 mb-2">No upcoming sessions</h3>
              <p className="text-sm text-gray-400">Book a session with one of our mentors</p>
            </div>
          ) : (
            <>
              <div className="grid gap-4">
                {enhancedSessions.upcoming.map((session) => 
                  renderSessionCard(session, false)
                )}
              </div>

              {pagination?.upcoming && (
                <PaginationControls 
                  pagination={pagination.upcoming}
                  onLoadMore={handleLoadMore}
                  loadingMore={loadingMore?.upcoming || false}
                  type="upcoming"
                />
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="past">
          {pagination?.past && (
            <PaginationInfo pagination={pagination.past} type="past" />
          )}
          
          {enhancedSessions.past.length === 0 ? (
            <div className="text-center py-10">
              <h3 className="text-gray-500 mb-2">No past sessions</h3>
              <p className="text-sm text-gray-400">Your completed sessions will appear here</p>
            </div>
          ) : (
            <>
              <div className="grid gap-4">
                {enhancedSessions.past.map((session) => 
                  renderSessionCard(session, true)
                )}
              </div>

              {pagination?.past && (
                <PaginationControls 
                  pagination={pagination.past}
                  onLoadMore={handleLoadMore}
                  loadingMore={loadingMore?.past || false}
                  type="past"
                />
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Cancel Session Dialog */}
      <Dialog open={cancelDialog} onOpenChange={setCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Session</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>Are you sure you want to cancel your session with {selectedSession?.mentor.name}?</p>
            <p className="mt-2 text-sm text-gray-500">
              Cancellations less than 24 hours before the session may incur a fee.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialog(false)} disabled={isCancelling}>
              Keep Session
            </Button>
            <Button variant="destructive" onClick={handleCancelSession} disabled={isCancelling}>
              {isCancelling ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Cancelling...
                </>
              ) : (
                'Yes, Cancel Session'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Feedback Dialog */}
      <Dialog open={feedbackDialog} onOpenChange={setFeedbackDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Leave Feedback</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <p>How would you rate your session with {selectedSession?.mentor.name}?</p>
              <div className="flex space-x-1">
                {[...Array(5)].map((_, i) => (
                  <button 
                    key={i} 
                    className="p-1 hover:scale-110 transition-transform"
                    onClick={() => setFeedbackRating(i + 1)}
                  >
                    <Star 
                      className={`h-6 w-6 ${
                        i < feedbackRating 
                          ? "text-yellow-500 fill-yellow-500" 
                          : "text-gray-300 hover:text-yellow-400"
                      }`} 
                    />
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium">Comments</label>
              <textarea
                className="w-full p-2 border rounded-md h-24 resize-none"
                placeholder="Share your experience with this mentor..."
                value={feedbackComment}
                onChange={(e) => setFeedbackComment(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFeedbackDialog(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button 
              className="bg-purple-600 hover:bg-purple-700" 
              onClick={handleSubmitFeedback}
              disabled={isSubmitting || feedbackRating === 0}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Feedback'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ToastContainer />
    </>
  );
};

export default MySessionsTab;