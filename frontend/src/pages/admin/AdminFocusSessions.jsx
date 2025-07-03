import React, { useState, useEffect, useCallback } from "react";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Search, X, ChevronLeft, ChevronRight, Clock, Users, Eye, BarChart3 } from "lucide-react";
import { adminAxios } from '../../utils/axios';
import { toast } from "react-hot-toast";
import debounce from "lodash/debounce";

const AdminFocusSessions = () => {
  const [sessions, setSessions] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [stats, setStats] = useState(null);
  const [showStats, setShowStats] = useState(false);
  const [pagination, setPagination] = useState({
    total_sessions: 0,
    total_pages: 0,
    current_page: 1,
    page_size: 10,
    has_next: false,
    has_previous: false
  });

  const fetchSessions = async (query = "", page = 1, status = "all") => {
    try {
      setLoading(true);
      setIsSearching(query !== "");
      
      // Build query parameters
      const params = new URLSearchParams();
      if (query) params.append('search', query);
      params.append('page', page.toString());
      params.append('page_size', pagination.page_size.toString());
      if (status !== "all") params.append('status', status);
      
      const response = await adminAxios.get(`/sessions/?${params.toString()}`);
      setSessions(response.data.sessions);
      setPagination(response.data.pagination);
      setError(null);
    } catch (err) {
      console.error('Error fetching sessions:', err);
      setError("Failed to fetch focus sessions. Please try again.");
      toast.error("Failed to fetch focus sessions");
      setSessions([]);
    } finally {
      setLoading(false);
      setIsSearching(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await adminAxios.get('/sessions/stats/');
      setStats(response.data);
    } catch (err) {
      console.error('Error fetching stats:', err);
      toast.error("Failed to fetch session statistics");
    }
  };

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce((query) => {
      fetchSessions(query, 1, statusFilter); // Reset to first page on new search
    }, 500),
    [statusFilter, pagination.page_size]
  );

  useEffect(() => {
    fetchSessions("", 1, statusFilter);
  }, [statusFilter]);

  useEffect(() => {
    if (showStats && !stats) {
      fetchStats();
    }
  }, [showStats, stats]);

  // Handle search input changes
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    debouncedSearch(value);
  };

  // Clear search
  const handleClearSearch = () => {
    setSearchQuery("");
    fetchSessions("", 1, statusFilter);
  };

  // Handle page change
  const handlePageChange = (newPage) => {
    fetchSessions(searchQuery, newPage, statusFilter);
  };

  // Handle status filter change
  const handleStatusFilterChange = (newStatus) => {
    setStatusFilter(newStatus);
    setSearchQuery("");
  };

  // Handle ending a session
  const handleEndSession = async (sessionId) => {
    if (!window.confirm('Are you sure you want to end this session?')) {
      return;
    }

    try {
      const response = await adminAxios.post(`/sessions/${sessionId}/end/`, {
        reason: 'admin_ended'
      });
      
      toast.success('Session ended successfully');
      // Refresh the current page
      fetchSessions(searchQuery, pagination.current_page, statusFilter);
    } catch (err) {
      console.error('Error ending session:', err);
      toast.error('Failed to end session');
    }
  };

  // View session details
  const handleViewSession = async (sessionId) => {
    try {
      const response = await adminAxios.get(`/sessions/${sessionId}/`);
      // You can implement a modal or navigate to a detail page
      console.log('Session details:', response.data);
      // For now, just show a toast with basic info
      toast.success('Session details loaded (check console)');
    } catch (err) {
      console.error('Error fetching session details:', err);
      toast.error('Failed to fetch session details');
    }
  };

  // Format duration
  const formatDuration = (minutes) => {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  // Get status badge color
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'active':
        return "bg-green-100 text-green-800";
      case 'completed':
        return "bg-blue-100 text-blue-800";
      case 'cancelled':
        return "bg-red-100 text-red-800";
      case 'expired':
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Calculate remaining time for active sessions
  const getRemainingTime = (session) => {
    if (session.status !== 'active' || !session.ends_at) return null;
    
    const now = new Date();
    const endsAt = new Date(session.ends_at);
    const remaining = Math.max(0, Math.floor((endsAt - now) / 1000 / 60));
    
    return remaining > 0 ? `${remaining} min left` : 'Expired';
  };

  const sortedSessions = sessions.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold">Focus Buddy Sessions</h1>
          
        </div>


        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 h-5 w-5" />
              <Input
                type="text"
                placeholder="Search sessions by title, creator, or session type..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="pl-10 pr-10"
              />
              {searchQuery && (
                <button
                  onClick={handleClearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>
            {isSearching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900"></div>
              </div>
            )}
          </div>

          {/* Status Filter */}
          <div className="flex gap-2">
            {["all", "active", "completed",  "expired"].map((status) => (
              <Button
                key={status}
                variant={statusFilter === status ? "default" : "outline"}
                size="sm"
                onClick={() => handleStatusFilterChange(status)}
                className="capitalize"
              >
                {status}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {loading && sessions.length === 0 ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-lg">Loading focus sessions...</p>
        </div>
      ) : error ? (
        <div className="text-center py-8 text-red-500">
          <p>{error}</p>
          <Button 
            onClick={() => fetchSessions(searchQuery, pagination.current_page, statusFilter)}
            className="mt-4"
            variant="outline"
          >
            Try Again
          </Button>
        </div>
      ) : sessions && sessions.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-lg text-gray-500">
            {searchQuery ? "No sessions found matching your search." : "No focus sessions found."}
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-md border border-gray-200">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Session Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Creator
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration & Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Participants
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedSessions.map((session) => (
                  <tr key={session.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">
                        {session.title || `${session.duration_minutes}min Focus Session`}
                      </div>
                      {session.description && (
                        <div className="text-xs text-gray-500 mt-1 max-w-xs truncate">
                          {session.description}
                        </div>
                      )}
                      {session.status === 'active' && getRemainingTime(session) && (
                        <div className="text-xs text-orange-600 flex items-center mt-1">
                          <Clock className="h-3 w-3 mr-1" />
                          {getRemainingTime(session)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{session.creator_id?.name || 'Unknown'}</div>
                      <div className="text-xs text-gray-500">{session.creator_id?.email || ''}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{formatDuration(session.duration_minutes)}</div>
                      <div className="text-xs text-gray-500 capitalize">{session.session_type || 'focus'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {session.max_participants || 'N/A'}
                      </div>
                      <div className="text-xs text-gray-500">max participants</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(session.status)}`}
                      >
                        {session.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {formatDate(session.created_at)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {pagination && pagination.total_pages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {((pagination.current_page - 1) * pagination.page_size) + 1} to{" "}
                {Math.min(pagination.current_page * pagination.page_size, pagination.total_sessions)} of{" "}
                {pagination.total_sessions} sessions
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.current_page - 1)}
                  disabled={!pagination.has_previous}
                  className="flex items-center"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <span className="text-sm text-gray-700">
                  Page {pagination.current_page} of {pagination.total_pages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.current_page + 1)}
                  disabled={!pagination.has_next}
                  className="flex items-center"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AdminFocusSessions;