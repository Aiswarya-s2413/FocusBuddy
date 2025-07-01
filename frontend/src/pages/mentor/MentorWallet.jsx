import React, { useState, useEffect } from "react";
import { Wallet, DollarSign, TrendingUp, CheckCircle, AlertCircle, Clock, RefreshCw, WifiOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import axios from "axios";

const MentorWallet = () => {
  const [earnings, setEarnings] = useState([]);
  const [walletSummary, setWalletSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

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
  
  
  const fetchWalletData = async () => {
    try {
      setError(null);
      
      const axiosInstance = createAxiosInstance();
      const response = await axiosInstance.get('/wallet/');

      // Check response status
      if (response.status === 401) {
        throw new Error('Authentication required. Please log in again.');
      } else if (response.status === 404) {
        throw new Error('Mentor profile not found.');
      } else if (response.status >= 400) {
        throw new Error(`Failed to fetch wallet data: ${response.status}`);
      }

      // Axios automatically parses JSON, so response.data contains the parsed data
      const data = response.data;
      
      setWalletSummary(data.wallet_summary);
      setEarnings(data.earnings);
      
    } catch (err) {
      console.error('Error fetching wallet data:', err);
      
      // Handle axios errors properly
      if (err.response) {
        // Server responded with error status
        if (err.response.status === 401) {
          setError('Authentication required. Please log in again.');
          // Optionally redirect to login page
          // window.location.href = '/login';
        } else if (err.response.status === 404) {
          setError('Mentor profile not found.');
        } else if (err.response.status === 403) {
          setError('Access denied. You may not have mentor privileges.');
        } else {
          setError(`Server error: ${err.response.status} - ${err.response.data?.message || err.response.data?.error || 'Unknown error'}`);
        }
      } else if (err.request) {
        // Network error
        setError('Network error. Please check your connection and try again.');
      } else {
        // Other error
        setError(err.message || 'An unexpected error occurred.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchWalletData();
  };

  useEffect(() => {
    fetchWalletData();
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

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-8">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-[#6E59A5]" />
          <div className="text-[#6E59A5]">Loading wallet data...</div>
        </div>
      </div>
    );
  }


  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-[#6E59A5] flex items-center">
            <Wallet className="h-8 w-8 mr-3" />
            My Wallet
          </h1>
        </div>
        
        {/* Error display using card instead of alert */}
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
      {error && (walletSummary || earnings.length > 0) && (
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
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#6E59A5]">
                {formatCurrency(walletSummary.total_earnings)}
              </div>
              <p className="text-xs text-muted-foreground">
                From {walletSummary.total_sessions} sessions
              </p>
            </CardContent>
          </Card>

          {/* <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available Balance</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(walletSummary.available_balance)}
              </div>
              <p className="text-xs text-muted-foreground">
                Ready for withdrawal
              </p>
            </CardContent>
          </Card> */}

          {/* <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Earnings</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {formatCurrency(walletSummary.pending_earnings)}
              </div>
              <p className="text-xs text-muted-foreground">
                Being processed
              </p>
            </CardContent>
          </Card> */}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Month</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#9b87f5]">
                {formatCurrency(walletSummary.this_month_earnings)}
              </div>
              <p className="text-xs text-muted-foreground">
                Current month earnings
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Transactions ({earnings.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {earnings.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="h-16 w-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions yet</h3>
              <p className="text-gray-600">Complete some sessions to start earning!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Session Details</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Commission</TableHead>
                    <TableHead>Your Earning</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {earnings.map((earning) => (
                    <TableRow key={earning.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{earning.session?.student?.name || 'N/A'}</div>
                          <div className="text-sm text-gray-600">
                            {earning.session?.duration_minutes ? getDurationLabel(earning.session.duration_minutes) : 'N/A'}
                            {earning.session?.subjects?.length > 0 && (
                              <> • {earning.session.subjects.map(subject => subject.name || subject).join(', ')}</>
                            )}
                          </div>
                          <div className="text-xs text-gray-500">
                            {earning.session?.scheduled_date && earning.session?.scheduled_time ? 
                              formatDateTime(`${earning.session.scheduled_date}T${earning.session.scheduled_time}`) :
                              formatDateTime(earning.created_at)
                            }
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{formatCurrency(earning.session_amount)}</TableCell>
                      <TableCell className="text-red-600">
                        -{formatCurrency(earning.platform_commission)}
                      </TableCell>
                      <TableCell className="font-medium text-green-600">
                        {formatCurrency(earning.mentor_earning)}
                      </TableCell>
                      <TableCell>
                        <Badge className={getPayoutStatusColor(earning.payout_status)}>
                          <div className="flex items-center">
                            {getPayoutStatusIcon(earning.payout_status)}
                            <span className="ml-1 capitalize">{earning.payout_status}</span>
                          </div>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {formatDateTime(earning.created_at)}
                          {earning.payout_date && (
                            <div className="text-xs text-gray-500">
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
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MentorWallet;