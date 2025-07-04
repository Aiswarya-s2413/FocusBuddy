import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import UsageGraph from "../../components/admin/UsageGraph";
import RecentActivityTable from "../../components/admin/RecentActivityTable";
import { adminAxios } from "../../utils/axios";
import {
  Users,
  Calendar,
  CreditCard,
  TrendingUp,
  Activity,
  BarChart3,
  Sparkles,
  UserCheck,
  Clock,
  MessageSquare,
  AlertCircle,
  Loader2,
  RefreshCw
} from "lucide-react";

const Admin = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch dashboard data from backend
  const fetchDashboardData = async () => {
    try {
      setError(null);
      const response = await adminAxios.get('/dashboard/');
      setDashboardData(response.data);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err.response?.data?.error || 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Refresh data manually
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Format numbers with commas
  const formatNumber = (num) => {
    return num?.toLocaleString() || '0';
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-purple-50/30 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-lg font-medium text-slate-600">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-purple-50/30 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">Error Loading Dashboard</h2>
          <p className="text-slate-600 mb-4">{error}</p>
          <button
            onClick={() => {
              setLoading(true);
              fetchDashboardData();
            }}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const keyMetrics = [
    {
      title: "Registered Users",
      value: formatNumber(dashboardData?.metrics?.registered_users),
      icon: <Users className="w-6 h-6 text-blue-600" />,
      bgColor: "from-blue-50 to-blue-100",
      textColor: "text-blue-900"
    },
    {
      title: "Approved Mentors",
      value: formatNumber(dashboardData?.metrics?.approved_mentors),
      icon: <UserCheck className="w-6 h-6 text-green-600" />,
      bgColor: "from-green-50 to-green-100",
      textColor: "text-green-900"
    },
    {
      title: "Total Focus Sessions",
      value: formatNumber(dashboardData?.metrics?.total_focus_sessions),
      icon: <Clock className="w-6 h-6 text-purple-600" />,
      bgColor: "from-purple-50 to-purple-100",
      textColor: "text-purple-900"
    },
    {
      title: "Total Mentor Sessions",
      value: formatNumber(dashboardData?.metrics?.total_mentor_sessions),
      icon: <MessageSquare className="w-6 h-6 text-indigo-600" />,
      bgColor: "from-indigo-50 to-indigo-100",
      textColor: "text-indigo-900"
    },
    {
      title: "Pending Mentor Approvals",
      value: formatNumber(dashboardData?.metrics?.pending_mentor_approvals),
      icon: <AlertCircle className="w-6 h-6 text-orange-600" />,
      bgColor: "from-orange-50 to-orange-100",
      textColor: "text-orange-900"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/40 to-purple-50/30">
      {/* Sticky header */}
      <div className="bg-white/80 backdrop-blur-xl border-b border-slate-200/50 sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-8 py-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
            <div className="flex items-center space-x-6">
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-2xl flex items-center justify-center shadow-xl">
                  <BarChart3 className="h-8 w-8 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                  <Sparkles className="h-3 w-3 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-5xl font-bold bg-gradient-to-r from-slate-800 via-indigo-700 to-purple-700 bg-clip-text text-transparent">
                  Admin Dashboard
                </h1>
                <p className="text-slate-600 font-medium mt-2 text-lg">
                  Monitor and manage your FocusPro platform with advanced insights
                </p>
              </div>
            </div>

            {/* Refresh Button */}
            <div className="flex items-center space-x-4">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-8 py-12 space-y-12">
        {/* Metrics */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-slate-800 mb-6">Key Platform Metrics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
            {keyMetrics.map((metric, index) => (
              <Card
                key={index}
                className="bg-white/90 backdrop-blur-sm border border-white/30 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 rounded-2xl overflow-hidden"
              >
                <CardContent className="p-6">
                  <div
                    className={`w-12 h-12 bg-gradient-to-br ${metric.bgColor} rounded-xl flex items-center justify-center mb-4 shadow-lg`}
                  >
                    {metric.icon}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-600 mb-1">{metric.title}</p>
                    <p className={`text-3xl font-bold ${metric.textColor}`}>{metric.value}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Usage Analytics */}
        <Card className="bg-white/90 backdrop-blur-sm border border-white/30 shadow-2xl hover:shadow-3xl transition-all duration-500 rounded-2xl overflow-hidden min-h-[800px]">
          <CardHeader className="pb-6 bg-gradient-to-r from-blue-50/50 to-indigo-50/50">
            <CardTitle className="flex items-center gap-4 text-2xl font-bold text-slate-800">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              Platform Usage Analytics
              <div className="ml-auto px-4 py-2 bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 rounded-full text-sm font-semibold">
                Live Data
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-8 pb-8">
            <UsageGraph usageData={dashboardData?.usage_data} />
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="bg-white/90 backdrop-blur-sm border border-white/30 shadow-2xl hover:shadow-3xl transition-all duration-500 rounded-2xl overflow-hidden group">
          <CardHeader className="pb-6 bg-gradient-to-r from-rose-50/50 to-pink-50/50">
            <CardTitle className="flex items-center gap-4 text-xl font-bold text-slate-800 group-hover:text-rose-700 transition-colors">
              <div className="w-10 h-10 bg-gradient-to-br from-rose-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                <Activity className="h-5 w-5 text-white" />
              </div>
              Recent Activity Feed
              <div className="ml-auto px-3 py-1 bg-gradient-to-r from-rose-100 to-pink-100 text-rose-700 rounded-full text-xs font-semibold">
                Real-time
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-8 pb-8">
            <RecentActivityTable activities={dashboardData?.recent_activities} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Admin;