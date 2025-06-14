import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import { Badge } from "../../components/ui/badge";
import { useToast } from "../../hooks/use-toast";
import { CheckCircle, XCircle, Calendar, Clock, MessageSquare } from "lucide-react";

// Mock requests data
const mockRequests = [
  {
    id: "1",
    student: {
      name: "Alex Johnson",
      email: "alex.johnson@example.com",
      profile_image_url: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=150&h=150&fit=crop&crop=face"
    },
    subject: "Python",
    sessionType: "Video Call",
    preferredDateTime: "2024-01-15T14:00:00",
    duration: "1 hour",
    message: "I need help with understanding object-oriented programming concepts in Python. I'm working on a project and getting stuck with classes and inheritance.",
    status: "pending",
    createdAt: "2024-01-10T10:30:00"
  },
  {
    id: "2",
    student: {
      name: "Sarah Chen",
      email: "sarah.chen@example.com",
      profile_image_url: "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=150&h=150&fit=crop&crop=face"
    },
    subject: "Machine Learning",
    sessionType: "Voice Call",
    preferredDateTime: "2024-01-16T10:00:00",
    duration: "30 mins",
    message: "Looking for guidance on feature selection techniques for my machine learning project. I have a dataset with many features and need help choosing the best ones.",
    status: "pending",
    createdAt: "2024-01-11T09:15:00"
  },
  {
    id: "3",
    student: {
      name: "Mike Rodriguez",
      email: "mike.rodriguez@example.com"
    },
    subject: "Data Science",
    sessionType: "Video Call",
    preferredDateTime: "2024-01-17T16:00:00",
    duration: "1 hour",
    message: "I need help with data visualization using matplotlib and seaborn. Want to create compelling charts for my data analysis project.",
    status: "accepted",
    createdAt: "2024-01-09T14:20:00"
  }
];

const MentorshipRequestsList = () => {
  const { toast } = useToast();
  const [requests, setRequests] = useState(mockRequests);

  const handleRequestAction = (requestId, action) => {
    setRequests(prev =>
      prev.map(request =>
        request.id === requestId
          ? { ...request, status: action === 'accept' ? 'accepted' : 'rejected' }
          : request
      )
    );

    toast({
      title: action === 'accept' ? "Request Accepted" : "Request Rejected",
      description: `You have ${action}ed the mentorship request.`,
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'accepted': return 'bg-green-100 text-green-700 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-700 border-red-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const processedRequests = requests.filter(r => r.status !== 'pending');

  return (
    <div className="space-y-6">
      {/* Pending Requests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Pending Requests ({pendingRequests.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {pendingRequests.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No pending requests</p>
            </div>
          ) : (
            pendingRequests.map((request) => (
              <div key={request.id} className="border rounded-lg p-4 space-y-4">
                <div className="flex items-start gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={request.student.profile_image_url} alt={request.student.name} />
                    <AvatarFallback>{request.student.name.charAt(0)}</AvatarFallback>
                  </Avatar>

                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{request.student.name}</h4>
                      <Badge variant="outline" className="bg-purple-100 text-purple-700">
                        {request.subject}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(request.preferredDateTime).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {new Date(request.preferredDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>

                    <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                      {request.message}
                    </p>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleRequestAction(request.id, 'accept')}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRequestAction(request.id, 'reject')}
                        className="text-red-600 border-red-200 hover:bg-red-50"
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {processedRequests.slice(0, 5).map((request) => (
            <div key={request.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={request.student.profile_image_url} alt={request.student.name} />
                  <AvatarFallback className="text-xs">{request.student.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">{request.student.name}</p>
                  <p className="text-xs text-gray-500">{request.subject}</p>
                </div>
              </div>
              <Badge variant="outline" className={getStatusColor(request.status)}>
                {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
              </Badge>
            </div>
          ))}

          {processedRequests.length === 0 && (
            <div className="text-center py-4 text-gray-500">
              <p className="text-sm">No recent activity</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MentorshipRequestsList;
