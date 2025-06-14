import React, { useState, useEffect } from "react";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Button } from "../../components/ui/button"; 
import { Badge } from "../../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { useToast } from "../../hooks/use-toast";
import {
  Camera,
  Clock,
  Star,
  Users,
  Calendar,
  CheckCircle,
  XCircle,
  Edit,
  Loader2,
} from "lucide-react";
import MentorAvailabilityEditor from "../../components/mentors/MentorAvailabilityEditor";
import MentorshipRequestsList from "../../components/mentors/MentorshipRequestsList";

const base_url = import.meta.env.VITE_API_BASE_URL;
const API_URL = `${base_url}/api/mentor`;

const Avatar = ({ children, className = "" }) => (
  <div className={`rounded-full bg-gray-200 flex items-center justify-center ${className}`}>
    {children}
  </div>
);

const AvatarImage = ({ src, alt, className = "" }) => {
  const [imageError, setImageError] = useState(false);
  
  if (!src) return null;

  let fixedSrc = src;
  
  // Handle different URL formats
  if (src.includes('cloudinary.com')) {
    // If it's already a full Cloudinary URL, check if it needs fixing
    if (src.includes('/v1/')) {
      // Replace generic /v1/ with the specific version number and add .jpg extension
      fixedSrc = src.replace('/v1/', '/v1749732168/');
      
      // Add .jpg.jpg extension if it ends with .jpg but not .jpg.jpg
      if (fixedSrc.endsWith('.jpg') && !fixedSrc.endsWith('.jpg.jpg')) {
        fixedSrc = fixedSrc + '.jpg';
      }
    } else {
      // Use the URL as is if it already has a proper version or no version
      fixedSrc = src;
    }
  } else if (src.startsWith('mentors/') || src.includes('/')) {
    // If it's just the path from database, construct the full Cloudinary URL
    // Remove any leading slash and ensure proper format
    const cleanPath = src.startsWith('/') ? src.substring(1) : src;
    
    // For mentor images, add .jpg.jpg as that seems to be the pattern
    let finalPath = cleanPath;
    if (cleanPath.includes('mentors/') && cleanPath.endsWith('.jpg') && !cleanPath.endsWith('.jpg.jpg')) {
      finalPath = `${cleanPath}.jpg`;
    } else if (!cleanPath.includes('.')) {
      finalPath = `${cleanPath}.jpg`;
    }
    
    // Use the specific version number
    fixedSrc = `https://res.cloudinary.com/dnq1fzs1l/image/upload/v1749732168/${finalPath}`;
  }
  
  console.log('Original URL:', src);
  console.log('Fixed URL:', fixedSrc);
  
  // Use a default image if image failed to load
  const defaultImage = "https://via.placeholder.com/150/cccccc/666666?text=No+Image";
  const imageSrc = imageError ? defaultImage : fixedSrc;
  
  return (
    <img 
      src={imageSrc} 
      alt={alt || "Avatar"} 
      className={`w-full h-full object-cover rounded-full ${className}`}
      onError={(e) => {
        console.log('Image failed to load:', e.target.src);
        if (!imageError) {
          setImageError(true);
        }
      }}
    />
  );
};
const AvatarFallback = ({ children, className = "" }) => (
  <div className={`text-gray-600 font-medium ${className}`}>{children}</div>
);


const MentorProfileDisplay = ({ mentorId = null }) => {
  const { toast } = useToast();
  const [mentor, setMentor] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isEditingImage, setIsEditingImage] = useState(false);
  const [error, setError] = useState(null);

  // Create axios instance with cookie-based authentication
  const createAxiosInstance = () => {
    return axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      // Enable cookies to be sent with requests
      withCredentials: true,
    });
  };

  // Fetch mentor profile data
  const fetchMentorProfile = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Construct URL - if mentorId is provided, fetch specific mentor, otherwise fetch current user's profile
      const endpoint = mentorId ? `/profile/${mentorId}/` : '/profile/';
      
      const axiosInstance = createAxiosInstance();
      const response = await axiosInstance.get(endpoint);
      
      setMentor(response.data);
    } catch (err) {
      console.error('Error fetching mentor profile:', err);
      console.error('Error response:', err.response?.data);
      console.error('Error status:', err.response?.status);
      
      // Handle authentication errors
      if (err.response?.status === 401) {
        setError('Authentication required. Please log in again.');
        toast({
          title: "Authentication Error",
          description: "Please log in again to access your profile.",
          variant: "destructive",
        });
        // Optionally redirect to login page here
        // window.location.href = '/login';
        return;
      }
      
      // Handle server errors
      if (err.response?.status === 500) {
        setError('Server error occurred. Please check your backend logs.');
        toast({
          title: "Server Error",
          description: "Internal server error. Please check the backend logs and try again.",
          variant: "destructive",
        });
        return;
      }
      
      const errorMessage = err.response?.data?.error || 
                          err.response?.data?.message || 
                          err.response?.data?.detail ||
                          err.message || 
                          'Failed to load mentor profile';
      setError(errorMessage);
      toast({
        title: "Error",
        description: "Failed to load mentor profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Load mentor profile on component mount
  useEffect(() => {
    fetchMentorProfile();
  }, [mentorId]);

  const handleImageUpload = async (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Validate file size (e.g., max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Please select an image smaller than 5MB.",
          variant: "destructive",
        });
        return;
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid File Type",
          description: "Please select a valid image file.",
          variant: "destructive",
        });
        return;
      }
      
      try {
        setIsUpdating(true);
        
        // Create FormData for file upload
        const formData = new FormData();
        formData.append('profile_image', file);

        const axiosInstance = createAxiosInstance();
        const response = await axiosInstance.put('/profile/', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          withCredentials: true,
        });

        // Update local state with new profile data
        setMentor(response.data.profile || response.data);
        setIsEditingImage(false);

        toast({
          title: "Profile Image Updated",
          description: "Your profile image has been updated successfully.",
        });
      } catch (err) {
        console.error('Error uploading image:', err);
        
        if (err.response?.status === 401) {
          toast({
            title: "Authentication Error",
            description: "Please log in again to update your profile.",
            variant: "destructive",
          });
          return;
        }
        
        const errorMessage = err.response?.data?.error || 
                            err.response?.data?.message || 
                            err.message || 
                            "Failed to upload image. Please try again.";
        toast({
          title: "Upload Failed",
          description: errorMessage,
          variant: "destructive",
        });
      } finally {
        setIsUpdating(false);
        // Reset file input
        e.target.value = '';
      }
    }
  };

  const handleAvailabilityUpdate = async (newAvailability) => {
    try {
      setIsUpdating(true);
      
      const updateData = {
        availability: newAvailability
      };

      const axiosInstance = createAxiosInstance();
      const response = await axiosInstance.put('/profile/', updateData, {
        withCredentials: true,
      });

      setMentor(response.data.profile || response.data);
      
      toast({
        title: "Availability Updated",
        description: "Your availability schedule has been updated successfully.",
      });
    } catch (err) {
      console.error('Error updating availability:', err);
      
      if (err.response?.status === 401) {
        toast({
          title: "Authentication Error",
          description: "Please log in again to update your availability.",
          variant: "destructive",
        });
        return;
      }
      
      const errorMessage = err.response?.data?.error || 
                          err.response?.data?.message || 
                          err.message || 
                          "Failed to update availability. Please try again.";
      toast({
        title: "Update Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleProfileUpdate = async (updateData) => {
    try {
      setIsUpdating(true);
      
      const axiosInstance = createAxiosInstance();
      const response = await axiosInstance.put('/profile/', updateData, {
        withCredentials: true,
      });

      setMentor(response.data.profile || response.data);
      
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      });
      
      return response.data;
    } catch (err) {
      console.error('Error updating profile:', err);
      
      if (err.response?.status === 401) {
        toast({
          title: "Authentication Error",
          description: "Please log in again to update your profile.",
          variant: "destructive",
        });
        throw err;
      }
      
      const errorMessage = err.response?.data?.error || 
                          err.response?.data?.message || 
                          err.message || 
                          "Failed to update profile. Please try again.";
      toast({
        title: "Update Failed",
        description: errorMessage,
        variant: "destructive",
      });
      throw err;
    } finally {
      setIsUpdating(false);
    }
  };

  const getExpertiseLevelColor = (level) => {
    switch (level?.toLowerCase()) {
      case "expert":
        return "bg-purple-100 text-purple-700 border-purple-200";
      case "advanced":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "intermediate":
        return "bg-green-100 text-green-700 border-green-200";
      case "beginner":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto p-6 flex items-center justify-center min-h-96">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading mentor profile...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !mentor) {
    return (
      <div className="max-w-7xl mx-auto p-6 flex items-center justify-center min-h-96">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Error Loading Profile</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={fetchMentorProfile} variant="outline">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header Section */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-start gap-6">
            <div className="relative">
              <Avatar className="h-32 w-32 border-4 border-white shadow-lg">
                <AvatarImage src={mentor.profile_image_url} alt={mentor.name} />
                {/* <AvatarFallback className="text-2xl">
                  {mentor.name?.charAt(0) || 'M'}
                </AvatarFallback> */}
              </Avatar>

              {/* Only show edit button if this is the current user's profile (no mentorId prop) */}
              {!mentorId && (
                <>
                  <button
                    onClick={() => setIsEditingImage(!isEditingImage)}
                    disabled={isUpdating}
                    className="absolute bottom-0 right-0 bg-white rounded-full p-2 shadow-md hover:shadow-lg transition-shadow disabled:opacity-50"
                  >
                    {isUpdating ? (
                      <Loader2 className="h-4 w-4 text-gray-600 animate-spin" />
                    ) : (
                      <Camera className="h-4 w-4 text-gray-600" />
                    )}
                  </button>

                  {isEditingImage && (
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="absolute bottom-0 right-0 opacity-0 cursor-pointer w-10 h-10"
                      disabled={isUpdating}
                    />
                  )}
                </>
              )}
            </div>

            <div className="flex-1 space-y-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {mentor.name}
                </h1>
                <p className="text-lg text-purple-600">
                  {mentor.subjects?.join(", ") || "No subjects listed"}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-1">
                  <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                  <span className="font-medium">{mentor.rating || 0}</span>
                  <span className="text-gray-500">
                    ({mentor.total_sessions || 0} sessions)
                  </span>
                </div>

                {mentor.expertise_level && (
                  <Badge
                    variant="outline"
                    className={getExpertiseLevelColor(mentor.expertise_level)}
                  >
                    {mentor.expertise_level.charAt(0).toUpperCase() +
                      mentor.expertise_level.slice(1)}
                  </Badge>
                )}

                <div className={`flex items-center gap-1 ${mentor.is_available ? 'text-green-600' : 'text-red-600'}`}>
                  <Clock className="h-4 w-4" />
                  <span className="text-sm">
                    {mentor.is_available ? "Available" : "Unavailable"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {mentor.total_sessions || 0}
                  </div>
                  <div className="text-sm text-gray-600">Total Sessions</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {mentor.total_students || 0}
                  </div>
                  <div className="text-sm text-gray-600">Students Helped</div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    Rs.{mentor.hourly_rate || 0}
                  </div>
                  <div className="text-sm text-gray-600">Per Hour</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side - Profile Details */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="details">Profile Details</TabsTrigger>
              <TabsTrigger value="availability">Availability</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>About Me</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 leading-relaxed">
                    {mentor.bio || "No bio available."}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Experience & Expertise</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">
                      Experience
                    </h4>
                    <p className="text-gray-600">{mentor.experience || "Not specified"}</p>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">
                      Subjects I Teach
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {mentor.subjects && mentor.subjects.length > 0 ? (
                        mentor.subjects.map((subject, index) => (
                          <Badge
                            key={`${subject}-${index}`}
                            variant="secondary"
                            className="bg-purple-100 text-purple-700"
                          >
                            {subject}
                          </Badge>
                        ))
                      ) : (
                        <p className="text-gray-500">No subjects listed</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="availability">
              <MentorAvailabilityEditor
                availability={mentor.availability || {}}
                onUpdate={handleAvailabilityUpdate}
                disabled={isUpdating || !!mentorId} // Disable editing if viewing another mentor's profile
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Side - Mentorship Requests */}
        <div className="space-y-6">
          {/* Only show mentorship requests for the current user's profile */}
          {!mentorId && <MentorshipRequestsList />}
        </div>
      </div>
    </div>
  );
};

export default MentorProfileDisplay;