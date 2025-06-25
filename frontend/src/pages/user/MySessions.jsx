import React from "react";
import MySessionsTab from "../../components/mentors/MySessionsTab";
import { useSessions } from "../../hooks/useSessions";
import { Loader2, AlertCircle, RefreshCw } from "lucide-react";

const MySessions = () => {
  const { 
    sessions, 
    loading, 
    error, 
    cancelSession, 
    submitFeedback, 
    refetch 
  } = useSessions();

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-purple-600" />
          <p className="text-gray-600">Loading your sessions...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="max-w-md mx-auto text-center py-10">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-red-800 mb-2">
            Oops! Something went wrong
          </h3>
          <p className="text-sm text-red-600 mb-4">{error}</p>
          <button 
            onClick={refetch}
            className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Mentoring Sessions</h1>
        <button
          onClick={refetch}
          className="inline-flex items-center px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
        >
          <RefreshCw className="h-4 w-4 mr-1" />
          Refresh
        </button>
      </div>
      
      <MySessionsTab 
        sessions={sessions} 
        onCancelSession={cancelSession}
        onSubmitFeedback={submitFeedback}
        onRefresh={refetch}
      />
    </div>
  );
};

export default MySessions;