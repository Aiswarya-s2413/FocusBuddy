import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { Clock, CheckCircle, XCircle, Coffee, ChevronLeft, ChevronRight, Loader2, AlertCircle, Filter } from 'lucide-react';
import { userAxios } from '../../utils/axios';

const PomodoroHistoryTable = () => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    count: 0,
    next: null,
    previous: null,
    current_page: 1,
    total_pages: 1
  });
  const [meta, setMeta] = useState({
    total_sessions: 0,
    completed_sessions: 0,
    focus_sessions: 0,
    completion_rate: 0
  });
  const [filters, setFilters] = useState({
    session_type: '',
    is_completed: '',
    page_size: 20
  });

  // Fetch pomodoro history from API
  const fetchPomodoroHistory = async (page = 1, appliedFilters = filters) => {
    setLoading(true);
    setError(null);
    
    try {
      // Build query parameters
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('page_size', appliedFilters.page_size);
      
      if (appliedFilters.session_type) {
        params.append('session_type', appliedFilters.session_type);
      }
      if (appliedFilters.is_completed !== '') {
        params.append('is_completed', appliedFilters.is_completed);
      }

      const response = await userAxios.get(`pomodoro-history/?${params.toString()}`);
      
      setSessions(response.data.results || []);
      setMeta(response.data.meta || {});
      
      // Handle pagination
      setPagination({
        count: response.data.count || 0,
        next: response.data.next,
        previous: response.data.previous,
        current_page: page,
        total_pages: Math.ceil((response.data.count || 0) / appliedFilters.page_size)
      });
      
    } catch (err) {
      console.error('Error fetching pomodoro history:', err);
      setError(err.response?.data?.error || 'Failed to fetch pomodoro history');
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchPomodoroHistory(1);
  }, []);

  // Handle pagination
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.total_pages) {
      fetchPomodoroHistory(newPage);
    }
  };

  // Handle filter changes
  const handleFilterChange = (filterName, value) => {
    const newFilters = { ...filters, [filterName]: value };
    setFilters(newFilters);
    fetchPomodoroHistory(1, newFilters);
  };

  // Format time display
  const formatTime = (timeString) => {
    if (!timeString) return 'N/A';
    return new Date(timeString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  // Get session type icon
  const getSessionTypeIcon = (type) => {
    switch (type) {
      case 'focus':
        return <Clock className="h-4 w-4 text-red-600" />;
      case 'short_break':
        return <Coffee className="h-4 w-4 text-blue-600" />;
      case 'long_break':
        return <Coffee className="h-4 w-4 text-green-600" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  // Get session type badge
  const getSessionTypeBadge = (type) => {
    switch (type) {
      case 'focus':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Focus</Badge>;
      case 'short_break':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Short Break</Badge>;
      case 'long_break':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Long Break</Badge>;
      default:
        return <Badge variant="secondary">{type}</Badge>;
    }
  };

  // Loading state
  if (loading && sessions.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
          <span className="ml-2 text-slate-600">Loading pomodoro history...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-center py-12">
          <AlertCircle className="h-8 w-8 text-red-600 mr-2" />
          <div className="text-center">
            <p className="text-red-600 font-semibold">Error loading history</p>
            <p className="text-slate-600 text-sm">{error}</p>
            <button 
              onClick={() => fetchPomodoroHistory(1)}
              className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <div className="flex items-center">
            <Clock className="h-5 w-5 text-blue-600 mr-2" />
            <div>
              <p className="text-sm text-slate-600">Total Sessions</p>
              <p className="text-2xl font-bold">{meta.total_sessions}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
            <div>
              <p className="text-sm text-slate-600">Completed</p>
              <p className="text-2xl font-bold">{meta.completed_sessions}</p>
            </div>
          </div>
        </div>
        
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border shadow-sm">
        <div className="flex items-center gap-4 flex-wrap">
          
          
          {/* <select 
            value={filters.is_completed}
            onChange={(e) => handleFilterChange('is_completed', e.target.value)}
            className="px-3 py-1 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Status</option>
            <option value="true">Completed</option>
            <option value="false">Incomplete</option>
          </select> */}
          
          {/* <select 
            value={filters.page_size}
            onChange={(e) => handleFilterChange('page_size', parseInt(e.target.value))}
            className="px-3 py-1 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={10}>10 per page</option>
            <option value={20}>20 per page</option>
            <option value={50}>50 per page</option>
          </select> */}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-slate-200 overflow-hidden bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/80">
              <TableHead className="font-semibold text-slate-700">Task</TableHead>
              <TableHead className="font-semibold text-slate-700">Session Type</TableHead>
              <TableHead className="font-semibold text-slate-700">Start Time</TableHead>
              <TableHead className="font-semibold text-slate-700">End Time</TableHead>
              <TableHead className="font-semibold text-slate-700">Duration</TableHead>
              <TableHead className="font-semibold text-slate-700">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions.map((session) => (
              <TableRow key={session.id} className="hover:bg-slate-50/50">
                <TableCell className="font-medium">
                  <div>
                    <p className="font-semibold text-slate-800">{session.task.title}</p>
                    <p className="text-sm text-slate-600">
                      {session.task.completed_pomodoros}/{session.task.estimated_pomodoros} pomodoros
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {getSessionTypeIcon(session.session_type)}
                    {getSessionTypeBadge(session.session_type)}
                  </div>
                </TableCell>
                <TableCell className="text-slate-600">
                  {formatTime(session.start_time)}
                </TableCell>
                <TableCell className="text-slate-600">
                  {session.end_time ? formatTime(session.end_time) : 'In Progress'}
                </TableCell>
                <TableCell className="text-slate-600">
                  {session.duration_minutes} min
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {session.is_completed ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Completed</Badge>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4 text-red-600" />
                        <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Incomplete</Badge>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination.total_pages > 1 && (
        <div className="flex items-center justify-between bg-white p-4 rounded-lg border shadow-sm">
          <div className="text-sm text-slate-700">
            Showing {((pagination.current_page - 1) * filters.page_size) + 1} to {Math.min(pagination.current_page * filters.page_size, pagination.count)} of {pagination.count} results
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(pagination.current_page - 1)}
              disabled={!pagination.previous || loading}
              className="flex items-center gap-1 px-3 py-1 border rounded-md text-sm hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>
            <span className="text-sm text-slate-700">
              Page {pagination.current_page} of {pagination.total_pages}
            </span>
            <button
              onClick={() => handlePageChange(pagination.current_page + 1)}
              disabled={!pagination.next || loading}
              className="flex items-center gap-1 px-3 py-1 border rounded-md text-sm hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {sessions.length === 0 && !loading && (
        <div className="text-center py-12 bg-white rounded-lg border">
          <Clock className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-600 text-lg">No Pomodoro sessions found</p>
          <p className="text-slate-500">Start your first Pomodoro session to see it here</p>
        </div>
      )}
    </div>
  );
};

export default PomodoroHistoryTable;