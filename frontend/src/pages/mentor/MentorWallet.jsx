import React, { useState, useEffect } from "react";
import { Wallet, DollarSign, TrendingUp, CheckCircle, AlertCircle, Clock, RefreshCw, WifiOff, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import axios from "axios";

const MentorWallet = () => {
  const [earnings, setEarnings] = useState([]);
  const [walletSummary, setWalletSummary] = useState(null);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const base_url = import.meta.env.VITE_API_BASE_URL;
  const API_URL = `${base_url}/api/mentor`;
  
  const createAxiosInstance = () => {
    return axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      withCredentials: true,
    });
  };
  
  const fetchWalletData = async (page = 1, size = 10) => {
    try {
      setError(null);
      
      const axiosInstance = createAxiosInstance();
      const response = await axiosInstance.get('/wallet/', {
        params: {
          page: page,
          page_size: size
        }
      });

      // Check response status
      if (response.status === 401) {
        throw new Error('Authentication required. Please log in again.');
      } else if (response.status === 404) {
        throw new Error('Mentor profile not found.');
      } else if (response.status >= 400) {
        throw new Error(`Failed to fetch wallet data: ${response.status}`);
      }

      const data = response.data;
      
      setWalletSummary(data.wallet_summary);
      setEarnings(data.earnings);
      setPagination(data.pagination);
      setCurrentPage(page);
      
    } catch (err) {
      console.error('Error fetching wallet data:', err);
      
      if (err.response) {
        if (err.response.status === 401) {
          setError('Authentication required. Please log in again.');
        } else if (err.response.status === 404) {
          setError('Mentor profile not found.');
        } else if (err.response.status === 403) {
          setError('Access denied. You may not have mentor privileges.');
        } else {
          setError(`Server error: ${err.response.status} - ${err.response.data?.message || err.response.data?.error || 'Unknown error'}`);
        }
      } else if (err.request) {
        setError('Network error. Please check your connection and try again.');
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

  const handlePageSizeChange = (newSize) => {
    setPageSize(newSize);
    setCurrentPage(1);
    setLoading(true);
    fetchWalletData(1, newSize);
  };

  useEffect(() => {
    fetchWalletData(currentPage, pageSize);
  }, []);

  const getPayoutStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPayoutStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'processing':
        return <Clock className="h-4 w-4" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

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

  // Pagination Component
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
            {/* Page numbers */}
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
                      ? 'bg-[#6E59A5] text-white'
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
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-[#6E59A5]" />
          <div className="text-[#6E59A5]">Loading wallet data...</div>
        </div>
      </div>
    );
  }

  if (error && !earnings.length) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-[#6E59A5] flex items-center">
            <Wallet className="h-8 w-8 mr-3" />
            My Wallet
          </h1>
        </div>
        
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
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
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-[#6E59A5] flex items-center">
            <Wallet className="h-8 w-8 mr-3" />
            My Wallet
          </h1>
          <p className="text-gray-600 mt-2">Track your earnings and transaction history</p>
        </div>
        
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center px-4 py-2 text-sm font-medium text-[#6E59A5] border border-[#6E59A5] rounded-md hover:bg-[#6E59A5] hover:text-white transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Show error banner if there's an error but we have cached data */}
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 max-w-4xl mx-auto">
          {/* Total Earnings Card - Enhanced */}
          <Card className="bg-gradient-to-br from-[#6E59A5] to-[#9b87f5] text-white border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white/90">Total Earnings</CardTitle>
              <div className="p-2 bg-white/20 rounded-lg">
                <DollarSign className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-1">
                {formatCurrency(walletSummary.total_earnings)}
              </div>
              <p className="text-white/80 text-sm">
                From {walletSummary.total_sessions} sessions completed
              </p>
              <div className="mt-4 flex items-center text-white/80 text-xs">
                <CheckCircle className="h-3 w-3 mr-1" />
                All time earnings
              </div>
            </CardContent>
          </Card>

          {/* This Month Card - Enhanced */}
          <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-white/90">This Month</CardTitle>
              <div className="p-2 bg-white/20 rounded-lg">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-1">
                {formatCurrency(walletSummary.this_month_earnings)}
              </div>
              <p className="text-white/80 text-sm">
                Current month earnings
              </p>
              <div className="mt-4 flex items-center text-white/80 text-xs">
                <Clock className="h-3 w-3 mr-1" />
                {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card className="shadow-lg">
        <CardHeader className="bg-gray-50 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl text-[#6E59A5] flex items-center">
              <DollarSign className="h-5 w-5 mr-2" />
              All Transactions {pagination && `(${pagination.total_items})`}
            </CardTitle>
            {pagination && (
              <Badge variant="outline" className="text-[#6E59A5] border-[#6E59A5]">
                Page {pagination.current_page} of {pagination.total_pages}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {earnings.length === 0 ? (
            <div className="text-center py-16">
              <div className="bg-gray-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                <DollarSign className="h-10 w-10 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions yet</h3>
              <p className="text-gray-600 max-w-sm mx-auto">
                Complete some mentoring sessions to start earning and see your transaction history here.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-semibold text-gray-700">Session Details</TableHead>
                      <TableHead className="font-semibold text-gray-700">Amount</TableHead>
                      <TableHead className="font-semibold text-gray-700">Commission</TableHead>
                      <TableHead className="font-semibold text-gray-700">Your Earning</TableHead>
                      <TableHead className="font-semibold text-gray-700">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">
                          <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-[#6E59A5]" />
                          <div className="text-gray-600">Loading transactions...</div>
                        </TableCell>
                      </TableRow>
                    )}
                    {!loading && earnings.map((earning, index) => (
                      <TableRow key={earning.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                        <TableCell className="py-4">
                          <div>
                            <div className="font-medium text-gray-900">{earning.session?.student?.name || 'N/A'}</div>
                            <div className="text-sm text-gray-600 mt-1">
                              {earning.session?.duration_minutes ? getDurationLabel(earning.session.duration_minutes) : 'N/A'}
                              {earning.session?.subjects?.length > 0 && (
                                <> • {earning.session.subjects.map(subject => subject.name || subject).join(', ')}</>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {earning.session?.scheduled_date && earning.session?.scheduled_time ? 
                                formatDateTime(`${earning.session.scheduled_date}T${earning.session.scheduled_time}`) :
                                formatDateTime(earning.created_at)
                              }
                            </div>
                            {/* Show Cancelled Badge if transaction is cancelled */}
                            {earning.is_cancelled && (
                              <span className="inline-block mt-2 px-2 py-1 text-xs rounded-full bg-red-100 text-red-800 font-semibold">Cancelled</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{formatCurrency(earning.session_amount)}</TableCell>
                        <TableCell className="text-red-600 font-medium">
                          -{formatCurrency(earning.platform_commission)}
                        </TableCell>
                        <TableCell className="font-bold text-green-600 text-lg">
                          {formatCurrency(earning.mentor_earning)}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div className="font-medium text-gray-900">
                              {formatDateTime(earning.created_at)}
                            </div>
                            {earning.payout_date && (
                              <div className="text-xs text-gray-500 mt-1">
                                Paid: {formatDateTime(earning.payout_date)}
                              </div>
                            )}
                            {earning.payout_reference && (
                              <div className="text-xs text-gray-500">
                                Ref: {earning.payout_reference}
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <PaginationControls />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MentorWallet;