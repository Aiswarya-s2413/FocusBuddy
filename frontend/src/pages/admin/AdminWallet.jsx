import React, { useState, useEffect } from "react";
import { 
  Wallet, 
  DollarSign, 
  TrendingUp, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  RefreshCw, 
  WifiOff, 
  ChevronLeft, 
  ChevronRight,
  Users,
  GraduationCap,
  Building
} from "lucide-react";
import { adminAxios } from '../../utils/axios'
const AdminWallet = () => {
  const [earnings, setEarnings] = useState([]);
  const [walletSummary, setWalletSummary] = useState(null);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  
  const fetchWalletData = async (page = 1, size = 10) => {
    try {
      setError(null);
      
      const response = await adminAxios.get('wallet/', {
        params: {
          page: page,
          page_size: size
        }
      });

      const data = response.data;
      
      setWalletSummary(data.wallet_summary);
      setEarnings(data.earnings);
      setPagination(data.pagination);
      setCurrentPage(page);
      
    } catch (err) {
      console.error('Error fetching wallet data:', err);
      
      // Handle different error types
      if (err.response?.status === 401) {
        setError('Authentication required. Please log in again.');
      } else if (err.response?.status === 403) {
        setError('Access denied. Admin privileges required.');
      } else if (err.response?.status >= 400) {
        setError(`Failed to fetch wallet data: ${err.response?.status}`);
      } else if (err.code === 'NETWORK_ERROR' || !err.response) {
        setError('Network error. Please check your internet connection.');
      } else {
        setError(err.message || 'An unexpected error occurred.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchWalletData(currentPage, pageSize);
  };

  const handlePageChange = (newPage) => {
    setLoading(true);
    fetchWalletData(newPage, pageSize);
  };

  useEffect(() => {
    fetchWalletData(currentPage, pageSize);
  }, []);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  const formatDateTime = (dateTimeString) => {
    return new Date(dateTimeString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDurationLabel = (minutes) => {
    if (minutes >= 60) {
      const hours = minutes / 60;
      return hours === 1 ? '1 hour' : `${hours} hours`;
    }
    return `${minutes} min`;
  };

  const PaginationControls = () => {
    if (!pagination) return null;

    const { current_page, total_pages, total_items, has_next, has_previous } = pagination;

    return (
      <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-t">
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-700">
            Showing {((current_page - 1) * pageSize) + 1} to {Math.min(current_page * pageSize, total_items)} of {total_items} transactions
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => handlePageChange(current_page - 1)}
            disabled={!has_previous || loading}
            className="flex items-center px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </button>

          <div className="flex items-center space-x-1">
            {Array.from({ length: Math.min(5, total_pages) }, (_, i) => {
              let pageNum;
              if (total_pages <= 5) {
                pageNum = i + 1;
              } else if (current_page <= 3) {
                pageNum = i + 1;
              } else if (current_page >= total_pages - 2) {
                pageNum = total_pages - 4 + i;
              } else {
                pageNum = current_page - 2 + i;
              }

              return (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  disabled={loading}
                  className={`px-3 py-2 text-sm font-medium rounded-md ${
                    pageNum === current_page
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => handlePageChange(current_page + 1)}
            disabled={!has_next || loading}
            className="flex items-center px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </button>
        </div>
      </div>
    );
  };

  if (loading && !earnings.length) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-8">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <div className="text-blue-600">Loading admin wallet data...</div>
        </div>
      </div>
    );
  }

  if (error && !earnings.length) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-blue-600 flex items-center">
            <Building className="h-8 w-8 mr-3" />
            Platform Revenue
          </h1>
        </div>
        
        <div className="border-red-200 bg-red-50 rounded-lg p-6">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <WifiOff className="h-6 w-6 text-red-500" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-medium text-red-900 mb-1">
                Unable to load wallet data
              </h3>
              <p className="text-red-700 mb-4">
                {error}
              </p>
              <button 
                onClick={handleRefresh}
                disabled={refreshing}
                className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Retrying...' : 'Try Again'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-blue-600 flex items-center">
            <Building className="h-8 w-8 mr-3" />
            Platform Revenue
          </h1>
          <p className="text-gray-600 mt-2">Track platform commission earnings and transaction history</p>
        </div>
        
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center px-4 py-2 text-sm font-medium text-blue-600 border border-blue-600 rounded-md hover:bg-blue-600 hover:text-white transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error && earnings.length > 0 && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-yellow-600 mr-3" />
            <div className="flex-1">
              <p className="text-yellow-800 text-sm">
                Unable to refresh data. Showing last available information.
              </p>
            </div>
            <button 
              onClick={handleRefresh}
              disabled={refreshing}
              className="text-yellow-600 hover:text-yellow-800 text-sm underline"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {walletSummary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-medium text-blue-100">Total Platform Revenue</div>
              <div className="p-2 bg-white/20 rounded-lg">
                <DollarSign className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="text-3xl font-bold mb-1">
              {formatCurrency(walletSummary.total_platform_commission)}
            </div>
            <p className="text-blue-100 text-sm">
              From {walletSummary.total_sessions} sessions
            </p>
          </div>

          <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 text-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-medium text-emerald-100">This Month</div>
              <div className="p-2 bg-white/20 rounded-lg">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="text-3xl font-bold mb-1">
              {formatCurrency(walletSummary.this_month_commission)}
            </div>
            <p className="text-emerald-100 text-sm">
              Current month revenue
            </p>
          </div>

          <div className="bg-gradient-to-br from-purple-600 to-purple-700 text-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-medium text-purple-100">Active Mentors</div>
              <div className="p-2 bg-white/20 rounded-lg">
                <GraduationCap className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="text-3xl font-bold mb-1">
              {walletSummary.total_mentors}
            </div>
            <p className="text-purple-100 text-sm">
              Registered mentors
            </p>
          </div>

          <div className="bg-gradient-to-br from-orange-600 to-orange-700 text-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-medium text-orange-100">Total Students</div>
              <div className="p-2 bg-white/20 rounded-lg">
                <Users className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="text-3xl font-bold mb-1">
              {walletSummary.total_students}
            </div>
            <p className="text-orange-100 text-sm">
              Active students
            </p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-lg">
        <div className="bg-gray-50 border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-blue-600 flex items-center">
              <DollarSign className="h-5 w-5 mr-2" />
              All Commission Transactions {pagination && `(${pagination.total_items})`}
            </h2>
            {pagination && (
              <div className="text-sm text-blue-600 border border-blue-600 rounded px-2 py-1">
                Page {pagination.current_page} of {pagination.total_pages}
              </div>
            )}
          </div>
        </div>
        
        <div className="p-0">
          {earnings.length === 0 ? (
            <div className="text-center py-16">
              <div className="bg-gray-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                <DollarSign className="h-10 w-10 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions yet</h3>
              <p className="text-gray-600 max-w-sm mx-auto">
                Commission earnings will appear here as mentoring sessions are completed on the platform.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Session Details</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mentor</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Session Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Platform Commission</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loading && (
                      <tr>
                        <td colSpan={6} className="text-center py-8">
                          <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-600" />
                          <div className="text-gray-600">Loading transactions...</div>
                        </td>
                      </tr>
                    )}
                    {!loading && earnings.map((earning, index) => (
                      <tr key={earning.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {earning.session?.duration_minutes ? getDurationLabel(earning.session.duration_minutes) : 'N/A'}
                            </div>
                            
                            <div className="text-xs text-gray-400 mt-1">
                              {earning.session?.scheduled_date && earning.session?.scheduled_time ? 
                                formatDateTime(`${earning.session.scheduled_date}T${earning.session.scheduled_time}`) :
                                formatDateTime(earning.created_at)
                              }
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{earning.mentor_name}</div>
                          <div className="text-sm text-gray-500">Mentor</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{earning.student_name}</div>
                          <div className="text-sm text-gray-500">Student</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {formatCurrency(earning.session_amount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600">
                          {formatCurrency(earning.platform_commission)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div>
                            <div className="font-medium">
                              {formatDateTime(earning.created_at)}
                            </div>
                            {earning.payout_date && (
                              <div className="text-xs text-gray-500 mt-1">
                                Paid: {formatDateTime(earning.payout_date)}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <PaginationControls />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminWallet;