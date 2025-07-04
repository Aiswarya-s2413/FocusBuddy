import React, { useState, useEffect } from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "../ui/table";
import { Badge } from "../ui/badge";
import { Clock, User, MessageSquare, CreditCard, Activity, RefreshCw, AlertCircle } from "lucide-react";
import { adminAxios } from "../../utils/axios";

const RecentActivityTable = ({ activities: propActivities }) => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Use prop activities if provided, otherwise fetch from API
  useEffect(() => {
    if (propActivities) {
      setActivities(propActivities);
    } else {
      fetchRecentActivities();
    }
  }, [propActivities]);

  const fetchRecentActivities = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminAxios.get('/recent-activity/');
      setActivities(response.data);
    } catch (err) {
      console.error('Error fetching recent activities:', err);
      setError(err.response?.data?.error || 'Failed to fetch recent activities');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchRecentActivities();
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case "session":
        return <Clock className="h-4 w-4 text-[#9b87f5]" />;
      case "signup":
        return <User className="h-4 w-4 text-[#0EA5E9]" />;
      case "feedback":
      case "journal":
        return <MessageSquare className="h-4 w-4 text-[#D946EF]" />;
      case "subscription":
        return <CreditCard className="h-4 w-4 text-[#F97316]" />;
      case "mood":
        return <Activity className="h-4 w-4 text-[#8B5CF6]" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getActivityBadge = (type) => {
    switch (type) {
      case "session":
        return <Badge variant="outline" className="border-[#9b87f5] text-[#9b87f5]">Session</Badge>;
      case "signup":
        return <Badge variant="outline" className="border-[#0EA5E9] text-[#0EA5E9]">Signup</Badge>;
      case "feedback":
        return <Badge variant="outline" className="border-[#D946EF] text-[#D946EF]">Feedback</Badge>;
      case "journal":
        return <Badge variant="outline" className="border-[#D946EF] text-[#D946EF]">Journal</Badge>;
      case "subscription":
        return <Badge variant="outline" className="border-[#F97316] text-[#F97316]">Subscription</Badge>;
      case "mood":
        return <Badge variant="outline" className="border-[#8B5CF6] text-[#8B5CF6]">Mood</Badge>;
      default:
        return <Badge variant="outline">Other</Badge>;
    }
  };

  const formatUserEmail = (email) => {
    // Extract username from email for display
    return email.split("@")[0];
  };

  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">Recent Activity</h3>
          <button
            onClick={handleRefresh}
            className="flex items-center space-x-2 px-3 py-1 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Retry</span>
          </button>
        </div>
        
        <div className="rounded-md border bg-red-50 p-6">
          <div className="flex items-center space-x-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            <span className="font-medium">Error loading activities</span>
          </div>
          <p className="text-sm text-red-600 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">Recent Activity</h3>
        {!propActivities && (
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center space-x-2 px-3 py-1 text-sm bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Loading...' : 'Refresh'}</span>
          </button>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]"></TableHead>
              <TableHead>User</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Time</TableHead>
              <TableHead className="w-[100px]">Type</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  <div className="flex items-center justify-center space-x-2">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Loading recent activities...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : activities.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                  No recent activities found
                </TableCell>
              </TableRow>
            ) : (
              activities.map((activity) => (
                <TableRow key={`${activity.type}-${activity.id}`}>
                  <TableCell>
                    {getActivityIcon(activity.type)}
                  </TableCell>
                  <TableCell className="font-medium">
                    {formatUserEmail(activity.user)}
                  </TableCell>
                  <TableCell>{activity.action}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {activity.time}
                  </TableCell>
                  <TableCell>
                    {getActivityBadge(activity.type)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default RecentActivityTable;