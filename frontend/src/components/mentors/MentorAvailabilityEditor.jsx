import React, { useState, useEffect } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Plus, X, Clock, Loader2, CheckCircle, AlertCircle } from "lucide-react";

const base_url = import.meta.env.VITE_API_BASE_URL;
const API_URL = `${base_url}/api/mentor`;

// Helper function to get CSRF token
const getCSRFToken = () => {
  const token = document.querySelector('[name=csrfmiddlewaretoken]')?.value ||
                document.querySelector('meta[name=csrf-token]')?.getAttribute('content') ||
                getCookie('csrftoken');
  return token;
};

const getCookie = (name) => {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
};

const createAxiosInstance = () => {
  const csrfToken = getCSRFToken();
  
  return axios.create({
    baseURL: API_URL,
    headers: {
      'Content-Type': 'application/json',
      ...(csrfToken && { 'X-CSRFToken': csrfToken }),
    },
    withCredentials: true,
  });
};

const MentorAvailabilityEditor = ({ availability, onUpdate }) => {
  const [editingAvailability, setEditingAvailability] = useState(availability || {});
  const [addingTime, setAddingTime] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Toast state management (similar to your Login component)
  const [toastConfig, setToastConfig] = useState({
    show: false,
    type: 'success', // 'success' or 'error'
    title: '',
    message: ''
  });

  // Auto-hide toast after 5 seconds
  useEffect(() => {
    if (toastConfig.show) {
      const timer = setTimeout(() => {
        setToastConfig(prev => ({ ...prev, show: false }));
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [toastConfig.show]);

  // Helper function to show toast
  const showToast = (type, title, message) => {
    setToastConfig({
      show: true,
      type,
      title,
      message
    });
  };

  const days = [
    { key: 'monday', label: 'Monday' },
    { key: 'tuesday', label: 'Tuesday' },
    { key: 'wednesday', label: 'Wednesday' },
    { key: 'thursday', label: 'Thursday' },
    { key: 'friday', label: 'Friday' },
    { key: 'saturday', label: 'Saturday' },
    { key: 'sunday', label: 'Sunday' },
  ];

  const timeSlots = [
    "09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", "1:00 PM", "2:00 PM", 
    "3:00 PM", "4:00 PM", "5:00 PM", "6:00 PM", "7:00 PM", "8:00 PM"
  ];

  const addTimeSlot = (day, time) => {
    const newAvailability = {
      ...editingAvailability,
      [day]: [...(editingAvailability[day] || []), time].sort()
    };
    setEditingAvailability(newAvailability);
    setAddingTime(null);
    
    // Show toast for adding time slot
    showToast('success', 'Time slot added', `Added ${time} to ${day.charAt(0).toUpperCase() + day.slice(1)}`);
  };

  const removeTimeSlot = (day, time) => {
    const newAvailability = {
      ...editingAvailability,
      [day]: (editingAvailability[day] || []).filter(t => t !== time)
    };
    setEditingAvailability(newAvailability);
    
    // Show toast for removing time slot
    showToast('success', 'Time slot removed', `Removed ${time} from ${day.charAt(0).toUpperCase() + day.slice(1)}`);
  };

  const saveAvailability = async () => {
    setIsSaving(true);
    
    try {
      console.log('Saving availability:', editingAvailability);
      console.log('API_URL:', API_URL);
      console.log('Base URL:', base_url);
      
      // Check authentication first
      const profileTest = createAxiosInstance();
      console.log('Testing profile endpoint access...');
      
      try {
        const profileResponse = await profileTest.get('/profile/');
        console.log('Profile endpoint works, user is authenticated');
      } catch (profileError) {
        console.error('Profile endpoint failed:', profileError);
        if (profileError.response?.status === 401) {
          throw new Error('Authentication failed - please log in again');
        }
      }
      
      // Create fresh axios instance for availability request
      const axiosInstance = createAxiosInstance();
      console.log('Trying availability endpoint...');
      
      // Log request details for debugging
      const requestData = {
        availability: editingAvailability
      };
      console.log('Request data:', requestData);
      console.log('Request headers:', axiosInstance.defaults.headers);
      
      const response = await axiosInstance.put('/availability/', requestData);
      console.log(' Availability response:', response.data);
      console.log(' Response status:', response.status);
      

      // Show success toast - request was successful since we got here without error
      showToast('success', 'Success! ', 'Your availability has been updated successfully!');
      
      
      if (onUpdate) {
        console.log(' Calling onUpdate with data...');
        // Use the availability from response if available, otherwise use what we sent
        const updatedAvailability = response.data.availability || response.data || editingAvailability;
        console.log(' Updated availability data:', updatedAvailability);
        onUpdate(updatedAvailability);
        console.log(' onUpdate called successfully');
      } else {
        console.log('ℹ️ No onUpdate callback provided');
      }
      
      console.log(' Success block completed successfully');
      
    } catch (error) {
      console.error('Error updating availability:', error);
      console.error('Error response:', error.response);
      console.error('Error status:', error.response?.status);
      console.error('Error data:', error.response?.data);
      
      let errorMessage = 'Failed to update availability';
      let errorTitle = 'Error';
      
      if (error.response?.status === 401) {
        errorMessage = 'Your session has expired. Please log in again.';
        errorTitle = 'Authentication Required';
      } else if (error.response?.status === 403) {
        errorMessage = 'You do not have permission to update this profile.';
        errorTitle = 'Permission Denied';
      } else if (error.response?.status === 404) {
        errorMessage = 'Availability service not found. Please contact support.';
        errorTitle = 'Service Unavailable';
      } else if (error.response?.status >= 500) {
        errorMessage = 'Server error occurred. Please try again later.';
        errorTitle = 'Server Error';
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error.response?.data?.errors) {
        const errorList = [];
        Object.entries(error.response.data.errors).forEach(([field, messages]) => {
          if (Array.isArray(messages)) {
            errorList.push(...messages);
          } else {
            errorList.push(messages);
          }
        });
        errorMessage = errorList.join(', ');
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      showToast('error', errorTitle, errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  
  return (
    <div className="relative">
      {/* Custom Toast Component (similar to your Login component) */}
      {toastConfig.show && (
        <div className="fixed top-4 right-4 z-50 max-w-sm animate-in slide-in-from-right-full">
          <div className={`border rounded-lg p-4 shadow-lg ${
            toastConfig.type === 'success' 
              ? 'bg-green-50 border-green-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center gap-3">
              {toastConfig.type === 'success' ? (
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
              )}
              <div>
                <p className={`text-sm font-medium ${
                  toastConfig.type === 'success' ? 'text-green-800' : 'text-red-800'
                }`}>
                  {toastConfig.title}
                </p>
                <p className={`text-xs mt-1 ${
                  toastConfig.type === 'success' ? 'text-green-700' : 'text-red-700'
                }`}>
                  {toastConfig.message}
                </p>
              </div>
              <button
                onClick={() => setToastConfig(prev => ({ ...prev, show: false }))}
                className={`ml-auto hover:opacity-80 ${
                  toastConfig.type === 'success' ? 'text-green-600' : 'text-red-600'
                }`}
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}

      <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Weekly Availability
          </CardTitle>
          <div className="flex gap-2">
            
            <Button 
              onClick={saveAvailability} 
              disabled={isSaving}
              className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {days.map(({ key, label }) => (
          <div key={key} className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-gray-900">{label}</h4>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAddingTime({ day: key, time: "" })}
                className="text-purple-600 border-purple-200 hover:bg-purple-50"
                disabled={isSaving}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Time
              </Button>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {(editingAvailability[key] || []).map((time) => (
                <Badge
                  key={time}
                  variant="secondary"
                  className="bg-green-100 text-green-700 pr-1"
                >
                  {time}
                  <button
                    onClick={() => removeTimeSlot(key, time)}
                    className="ml-1 hover:bg-green-200 rounded-full p-1"
                    disabled={isSaving}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              
              {(!editingAvailability[key] || editingAvailability[key].length === 0) && (
                <span className="text-gray-400 text-sm">No times set</span>
              )}
            </div>
            
            {addingTime?.day === key && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">Select a time slot:</p>
                <div className="flex flex-wrap gap-2">
                  {timeSlots
                    .filter(time => !editingAvailability[key]?.includes(time))
                    .map((time) => (
                      <Button
                        key={time}
                        variant="outline"
                        size="sm"
                        onClick={() => addTimeSlot(key, time)}
                        className="text-xs"
                        disabled={isSaving}
                      >
                        {time}
                      </Button>
                    ))}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setAddingTime(null)}
                  className="mt-2 text-gray-500"
                  disabled={isSaving}
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
    </div>
  );
};

export default MentorAvailabilityEditor;