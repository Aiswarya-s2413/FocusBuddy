import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../../hooks/use-toast";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Label } from "../../components/ui/label";
import { Badge } from "../../components/ui/badge";
import { Card, CardContent } from "../../components/ui/card";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "../../components/ui/form";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import { Camera, CheckCircle, Clock, XCircle, AlertCircle, User, AlertTriangle } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";

const base_url = import.meta.env.VITE_API_BASE_URL;
const API_URL = `${base_url}/api/mentor`;

// Schema for form validation - removed languages and title
const mentorProfileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  bio: z.string().min(10, "Bio must be at least 10 characters"),
  subjects: z.string().min(2, "Please enter at least one subject"),
  experience: z.string().min(1, "Experience is required"),
  hourlyRate: z.coerce.number().positive("Hourly rate must be positive"),
});

const MentorProfileUpload = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [image, setImage] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [level, setLevel] = useState("Intermediate");
  const [isLoading, setIsLoading] = useState(false);
  const [existingProfile, setExistingProfile] = useState(null);
  const [approvalStatus, setApprovalStatus] = useState(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const form = useForm({
    resolver: zodResolver(mentorProfileSchema),
    defaultValues: {
      name: "",
      bio: "",
      subjects: "",
      experience: "1+ Years",
      hourlyRate: 40,
    },
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setIsLoading(true);
        const response = await axios.get(`${API_URL}/profile-upload/`, {
          withCredentials: true,
        });

        if (response.data) {
          setExistingProfile(response.data);

          if (response.data.submitted_for_approval === true) {
            setIsSubmitted(true);
            setApprovalStatus({
              status: response.data.approval_status || "pending",
              submitted_at: response.data.submitted_at,
              approved_at: response.data.approved_at,
              approved_by: response.data.approved_by,
              is_approved: response.data.is_approved || false,
              rejection_reason: response.data.rejection_reason || null,
            });
            return; // Exit early if profile is submitted
          } else {
            setIsSubmitted(false);
            setApprovalStatus(null);

            const frontendData = {
              name: response.data.name || "",
              bio: response.data.bio || "",
              subjects: Array.isArray(response.data.subjects)
                ? response.data.subjects.join(", ")
                : response.data.subjects || "",
              experience: response.data.experience || "1+ Years",
              hourlyRate: response.data.hourly_rate || 40,
            };

            Object.keys(frontendData).forEach((key) => {
              form.setValue(key, frontendData[key]);
            });

            if (response.data.expertise_level) {
              const expertiseLevel =
                response.data.expertise_level.charAt(0).toUpperCase() +
                response.data.expertise_level.slice(1);
              setLevel(expertiseLevel);
            }

            if (response.data.profile_image_url) {
              setImage(response.data.profile_image_url);
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch profile data:", error);
        if (error.response?.status !== 404) {
          toast({
            title: "Failed to load profile",
            description: "Could not load your existing profile data.",
            variant: "destructive",
          });
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleImageUpload = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      const imageUrl = URL.createObjectURL(file);
      setImage(imageUrl);

      toast({
        title: "Image ready for upload",
        description: "Your profile image will be uploaded when you save your profile.",
      });
    }
  };

  const handleLevelChange = (newLevel) => {
    console.log("Changing expertise level from", level, "to", newLevel);
    setLevel(newLevel);
  };

  const onSubmit = async (data) => {
    try {
      setIsLoading(true);

      const formData = new FormData();

      const backendData = {
        name: data.name,
        bio: data.bio,
        subjects: data.subjects.split(",").map((subject) => subject.trim()),
        experience: data.experience,
        hourly_rate: data.hourlyRate,
        expertise_level: level.toLowerCase(),
      };

      formData.append("data", JSON.stringify(backendData));
      formData.append("expertise_level", level.toLowerCase());

      if (imageFile) {
        formData.append("profile_image", imageFile);
      }

      const response = await axios({
        method: existingProfile ? "put" : "post",
        url: `${API_URL}/profile-upload/`,
        data: formData,
        withCredentials: true,
      });

      setExistingProfile(response.data.profile || response.data);

      if (response.data.profile) {
        setIsSubmitted(response.data.profile.submitted_for_approval);
        if (response.data.profile.submitted_for_approval) {
          setApprovalStatus({
            status: response.data.profile.approval_status || "pending",
            submitted_at: response.data.profile.submitted_at,
            approved_at: response.data.profile.approved_at,
            approved_by: response.data.profile.approved_by,
            is_approved: response.data.profile.is_approved || false,
            rejection_reason: response.data.profile.rejection_reason || null,
          });
        }
      } else {
        setIsSubmitted(true);
        setApprovalStatus({
          status: "pending",
          submitted_at: new Date().toISOString(),
          approved_at: null,
          approved_by: null,
          is_approved: false,
          rejection_reason: null,
        });
      }

      toast({
        title: "Profile submitted",
        description: "Your mentor profile has been submitted for admin approval.",
        duration: 5000,
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error",
        description: error.response?.data?.error || "Failed to update profile. Please try again.",
        variant: "destructive",
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "pending":
        return <Clock className="h-6 w-6 text-yellow-500" />;
      case "approved":
        return <CheckCircle className="h-6 w-6 text-green-500" />;
      case "rejected":
        return <XCircle className="h-6 w-6 text-red-500" />;
      default:
        return <AlertCircle className="h-6 w-6 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 border-yellow-300 text-yellow-800";
      case "approved":
        return "bg-green-100 border-green-300 text-green-800";
      case "rejected":
        return "bg-red-100 border-red-300 text-red-800";
      default:
        return "bg-gray-100 border-gray-300 text-gray-800";
    }
  };

  const getStatusMessage = (status) => {
    switch (status) {
      case "pending":
        return "Your mentor profile is currently under review by our admin team. We will notify you once a decision has been made.";
      case "approved":
        return "Congratulations! Your mentor profile has been approved. You can now start accepting mentoring sessions.";
      case "rejected":
        return "Your mentor profile was not approved. Please review the feedback below and make the necessary changes before resubmitting.";
      default:
        return "Status unknown. Please contact support for assistance.";
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderExpertiseLevel = (levelName, isActive) => {
    const colorMap = {
      Beginner: isActive ? "bg-blue-500 text-white" : "bg-blue-100 text-blue-800",
      Intermediate: isActive ? "bg-green-500 text-white" : "bg-green-100 text-green-800",
      Advanced: isActive ? "bg-orange-500 text-white" : "bg-orange-100 text-orange-800",
      Expert: isActive ? "bg-purple-500 text-white" : "bg-purple-100 text-purple-800",
    };

    return (
      <Badge
        className={`px-3 py-1 text-xs font-medium cursor-pointer ${colorMap[levelName]}`}
        onClick={() => handleLevelChange(levelName)}
      >
        {levelName}
      </Badge>
    );
  };

  const handleResubmit = async () => {
    try {
      setIsLoading(true);

      setIsSubmitted(false);
      setApprovalStatus(null);

      if (existingProfile) {
        const frontendData = {
          name: existingProfile.name || "",
          bio: existingProfile.bio || "",
          subjects: Array.isArray(existingProfile.subjects)
            ? existingProfile.subjects.join(", ")
            : existingProfile.subjects || "",
          experience: existingProfile.experience || "1+ Years",
          hourlyRate: existingProfile.hourly_rate || 40,
        };

        Object.keys(frontendData).forEach((key) => {
          form.setValue(key, frontendData[key]);
        });

        if (existingProfile.expertise_level) {
          const expertiseLevel =
            existingProfile.expertise_level.charAt(0).toUpperCase() +
            existingProfile.expertise_level.slice(1);
          setLevel(expertiseLevel);
        }

        if (existingProfile.profile_image_url) {
          setImage(existingProfile.profile_image_url);
        }
      }
    } catch (error) {
      console.error("Error during resubmit preparation:", error);
      toast({
        title: "Error",
        description: "Failed to prepare form for resubmission.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoToProfile = () => {
    navigate("/mentor/profile-display");
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>Loading profile data...</p>
      </div>
    );
  }

  if (isSubmitted && approvalStatus) {
    return (
      <div className="max-w-4xl mx-auto my-8 px-4">
        <h1 className="text-3xl font-bold mb-8 text-center">Mentor Profile Status</h1>

        <Card className="max-w-2xl mx-auto">
          <CardContent className="p-8 text-center">
            <div className="flex justify-center mb-4">
              {getStatusIcon(approvalStatus.status)}
            </div>

            <h2 className="text-2xl font-semibold mb-4">Request Sent for Admin Approval</h2>

            <div className={`p-4 rounded-lg border-2 mb-6 ${getStatusColor(approvalStatus.status)}`}>
              <div className="flex items-center justify-center mb-2">
                <Badge
                  className={`text-sm font-medium px-3 py-1 ${
                    approvalStatus.status === "pending"
                      ? "bg-yellow-500 text-white"
                      : approvalStatus.status === "approved"
                      ? "bg-green-500 text-white"
                      : "bg-red-500 text-white"
                  }`}
                >
                  {approvalStatus.status.charAt(0).toUpperCase() +
                    approvalStatus.status.slice(1)}
                </Badge>
              </div>
              <p className="text-sm">{getStatusMessage(approvalStatus.status)}</p>
            </div>

            {/* Rejection Reason Section */}
            {approvalStatus.status === "rejected" && approvalStatus.rejection_reason && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-left">
                <div className="flex items-center mb-2">
                  <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
                  <h3 className="text-lg font-semibold text-red-800">Rejection Reason</h3>
                </div>
                <div className="bg-white border border-red-200 rounded p-3">
                  <p className="text-sm text-red-700 whitespace-pre-wrap">
                    {approvalStatus.rejection_reason}
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-3 text-sm text-gray-600 mb-6">
              {approvalStatus.submitted_at && (
                <div>
                  <strong>Submitted:</strong> {formatDate(approvalStatus.submitted_at)}
                </div>
              )}
              {approvalStatus.approved_at && (
                <div>
                  <strong>Processed:</strong> {formatDate(approvalStatus.approved_at)}
                </div>
              )}
              {approvalStatus.approved_by && (
                <div>
                  <strong>Processed by:</strong> {approvalStatus.approved_by}
                </div>
              )}
            </div>

            <div className="flex justify-center gap-4">
              {approvalStatus.status === "rejected" && (
                <Button onClick={handleResubmit} disabled={isLoading}>
                  {isLoading ? "Preparing..." : "Resubmit Profile"}
                </Button>
              )}
              {(approvalStatus.status === "approved" || approvalStatus.is_approved) && (
                <Button onClick={handleGoToProfile} className="bg-green-600 hover:bg-green-700">
                  <User className="h-4 w-4 mr-2" />
                  Go to Profile
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto my-8 px-4">
      <h1 className="text-3xl font-bold mb-8">
        {existingProfile ? "Update Your Mentor Profile" : "Create Your Mentor Profile"}
      </h1>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card className="overflow-hidden">
            <CardContent className="p-6">
              <div className="flex flex-col items-center mb-6">
                <div className="relative mb-4">
                  <Avatar className="h-32 w-32 border-4 border-white shadow-lg">
                    <AvatarImage src={image || "/placeholder.svg"} alt="Profile" />
                    <AvatarFallback>
                      <Camera className="h-8 w-8 text-gray-400" />
                    </AvatarFallback>
                  </Avatar>

                  <label className="absolute bottom-0 right-0 bg-white rounded-full p-2 shadow-md cursor-pointer">
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleImageUpload}
                    />
                    <Camera className="h-5 w-5 text-gray-600" />
                  </label>
                </div>
                <p className="text-sm text-gray-500 mt-2">Upload a professional profile photo</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Dr. John Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-4">
                  <div>
                    <Label>Expertise Level</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {["Beginner", "Intermediate", "Advanced", "Expert"].map((expertiseLevel) => (
                        <div key={expertiseLevel}>
                          {renderExpertiseLevel(expertiseLevel, level === expertiseLevel)}
                        </div>
                      ))}
                    </div>
                    <div className="mt-2">
                      <p className="text-sm text-gray-700">
                        Current expertise level: <strong>{level}</strong>
                      </p>
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name="subjects"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subjects (comma-separated)</FormLabel>
                        <FormControl>
                          <Input placeholder="Python, Django, Machine Learning" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Biography</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Tell students about yourself, your teaching style, and what they can expect from your sessions."
                        className="min-h-32"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <FormField
                  control={form.control}
                  name="experience"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Experience</FormLabel>
                      <FormControl>
                        <Input placeholder="5+ Years" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hourlyRate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hourly Rate</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" step="0.01" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/mentor-profile")}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : "Save Profile"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default MentorProfileUpload;