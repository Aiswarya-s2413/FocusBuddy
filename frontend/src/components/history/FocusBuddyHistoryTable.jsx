import React, { useState, useEffect } from 'react';
import { Table, TableBody, TableCell, TableHeader, TableHeaderCell, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Users, CheckCircle, XCircle, Clock, AlertCircle, Filter, RefreshCw, Loader2 } from 'lucide-react';
import { userAxios } from '../../utils/axios'; 

const FocusBuddyHistoryTable = () => {
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
  const [filters, setFilters] = useState({
    status: '',
    session_type: '',
    page: 1
  });

  // Fetch sessions from backend
  const fetchSessions = async (page = 1, additionalFilters = {}) => {
    try {
      setLoading(true);
      setError(null);

      // Build query parameters
      const params = new URLSearchParams();
      params.append('page', page);
      
      if (filters.status) params.append('status', filters.status);
      if (filters.session_type) params.append('session_type', filters.session_type);
      
      // Add any additional filters
      Object.entries(additionalFilters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });

      const response = await userAxios.get(`focus-buddy/history/?${params.toString()}`);
      
      setSessions(response.data.results);
      setPagination({
        count: response.data.count,
        next: response.data.next,
        previous: response.data.previous,
        current_page: page,
        total_pages: Math.ceil(response.data.count / 20) // Assuming 20 items per page
      });
    } catch (err) {
      console.error('Error fetching focus buddy sessions:', err);
      setError('Failed to load focus buddy sessions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchSessions(filters.page);
  }, []);

  // Handle filter changes
  const handleFilterChange = (filterType, value) => {
    const newFilters = { ...filters, [filterType]: value, page: 1 };
    setFilters(newFilters);
    fetchSessions(1, { [filterType]: value });
  };

  // Handle pagination
  const handlePageChange = (newPage) => {
    const updatedFilters = { ...filters, page: newPage };
    setFilters(updatedFilters);
    fetchSessions(newPage);
  };

  // Refresh data
  const handleRefresh = () => {
    fetchSessions(filters.page);
  };

  const formatTime = (timeString) => {
    if (!timeString) return 'N/A';
    return new Date(timeString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'active':
        return <Clock className="h-4 w-4 text-blue-600" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'expired':
        return <AlertCircle className="h-4 w-4 text-orange-600" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Completed</Badge>;
      case 'active':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Active</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Cancelled</Badge>;
      case 'expired':
        return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">Expired</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getSessionTypeBadge = (type) => {
    switch (type) {
      case 'study':
        return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">Study</Badge>;
      case 'work':
        return <Badge className="bg-indigo-100 text-indigo-800 hover:bg-indigo-100">Work</Badge>;
      case 'reading':
        return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Reading</Badge>;
      default:
        return <Badge variant="secondary">{type}</Badge>;
    }
  };

  if (loading && sessions.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <span className="ml-3 text-lg text-slate-600">Loading focus buddy sessions...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <p className="text-red-600 text-lg mb-4">{error}</p>
        <Button onClick={handleRefresh} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with filters and refresh */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h2 className="text-2xl font-bold text-slate-800">Focus Buddy History</h2>
          <span className="text-sm text-slate-500">
            {pagination.count} total sessions
          </span>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4 p-4 bg-slate-50 rounded-lg">
        <Filter className="h-5 w-5 text-slate-500" />
        <div className="flex space-x-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="expired">Expired</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
            <select
              value={filters.session_type}
              onChange={(e) => handleFilterChange('session_type', e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Types</option>
              <option value="study">Study</option>
              <option value="work">Work</option>
              <option value="reading">Reading</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-slate-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/80">
              <TableHeaderCell className="font-semibold text-slate-700">Session</TableHeaderCell>
              <TableHeaderCell className="font-semibold text-slate-700">Type</TableHeaderCell>
              <TableHeaderCell className="font-semibold text-slate-700">Creator</TableHeaderCell>
              <TableHeaderCell className="font-semibold text-slate-700">Start Time</TableHeaderCell>
              <TableHeaderCell className="font-semibold text-slate-700">End Time</TableHeaderCell>
              <TableHeaderCell className="font-semibold text-slate-700">Duration</TableHeaderCell>
              <TableHeaderCell className="font-semibold text-slate-700">Participants</TableHeaderCell>
              <TableHeaderCell className="font-semibold text-slate-700">Status</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions.map((session) => (
              <TableRow key={session.id} className="hover:bg-slate-50/50">
                <TableCell className="font-medium">
                  <div>
                    <p className="font-semibold text-slate-800">
                      {session.title || `${session.duration_minutes}min Focus Session`}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  {getSessionTypeBadge(session.session_type)}
                </TableCell>
                <TableCell className="text-slate-600">
                  {session.creator?.name || 'Unknown'}
                </TableCell>
                <TableCell className="text-slate-600">
                  {formatTime(session.started_at)}
                </TableCell>
                <TableCell className="text-slate-600">
                  {formatTime(session.ended_at || session.ends_at)}
                </TableCell>
                <TableCell className="text-slate-600">
                  {session.duration_minutes} min
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-slate-500" />
                    <span className="text-slate-600">
                      {session.participant_count}/{session.max_participants}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(session.status)}
                    {getStatusBadge(session.status)}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination.count > 20 && (
        <div className="flex items-center justify-between px-2">
          <div className="text-sm text-slate-500">
            Showing {((pagination.current_page - 1) * 20) + 1} to {Math.min(pagination.current_page * 20, pagination.count)} of {pagination.count} sessions
          </div>
          <div className="flex items-center space-x-2">
            <Button
              onClick={() => handlePageChange(pagination.current_page - 1)}
              disabled={!pagination.previous || loading}
              variant="outline"
              size="sm"
            >
              Previous
            </Button>
            <span className="text-sm font-medium text-slate-700">
              Page {pagination.current_page} of {pagination.total_pages}
            </span>
            <Button
              onClick={() => handlePageChange(pagination.current_page + 1)}
              disabled={!pagination.next || loading}
              variant="outline"
              size="sm"
            >
              Next
            </Button>
          </div>
        </div>
      )}
      
      {/* Empty state */}
      {sessions.length === 0 && !loading && (
        <div className="text-center py-12">
          <Users className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-600 text-lg">No Focus Buddy sessions found</p>
          <p className="text-slate-500">
            {filters.status || filters.session_type 
              ? 'Try adjusting your filters to see more sessions'
              : 'Join or create your first Focus Buddy session to see it here'
            }
          </p>
        </div>
      )}
    </div>
  );
};

export default FocusBuddyHistoryTable;