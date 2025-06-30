import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { 
  Search, 
  CheckCircle, 
  XCircle, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  LogOut, 
  Eye,
  Clock,
  User,
  DollarSign,
  Award
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { adminAxios } from "../../utils/axios";

const Card = ({ children, className = "" }) => (
  <div className={`border border-gray-200 rounded-lg shadow-sm ${className}`}>
    {children}
  </div>
);

const CardContent = ({ children, className = "" }) => (
  <div className={className}>{children}</div>
);

const Avatar = ({ children, className = "" }) => (
  <div className={`rounded-full bg-gray-200 flex items-center justify-center ${className}`}>
    {children}
  </div>
);

const AvatarImage = ({ src, alt, className = "" }) => {
  const [imageError, setImageError] = useState(false);
  
  // Use a default image if no src provided or if image failed to load
  const defaultImage = "https://via.placeholder.com/150/cccccc/666666?text=No+Image";
  const imageSrc = (!src || imageError) ? defaultImage : src;

  let fixedSrc = imageSrc;
  if (!src) return null;

  
  
  // Handle different URL formats
  if (src.includes('cloudinary.com')) {
    // If it's already a full Cloudinary URL with generic v1, remove it and reconstruct
    if (src.includes('/v1/')) {
      // Extract the path after v1/ 
      const pathAfterV1 = src.split('/v1/')[1];
      const baseUrl = src.split('/v1/')[0];
      
      // Reconstruct without version (let Cloudinary handle it automatically)
      fixedSrc = `${baseUrl}/${pathAfterV1}`;
      
      // Add extra .jpg extension if the original has .jpg but not .jpg.jpg
      if (!fixedSrc.endsWith('.jpg.jpg') && fixedSrc.endsWith('.jpg')) {
        fixedSrc = fixedSrc + '.jpg';
      }
    }
  } else if (src.startsWith('mentors/') || src.includes('/')) {
    // If it's just the path from database, construct the full Cloudinary URL without version
    fixedSrc = `https://res.cloudinary.com/dnq1fzs1l/image/upload/${src}.jpg`;
  }
  
  console.log('Original URL:', src);
  console.log('Fixed URL:', fixedSrc);
  
  return (
    <img 
      src={fixedSrc} 
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

const Badge = ({ children, className = "" }) => (
  <span className={`px-2 py-1 text-xs font-medium rounded-full ${className}`}>
    {children}
  </span>
);

// Toast Component
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 4000); // Auto close after 4 seconds

    return () => clearTimeout(timer);
  }, [onClose]);

  const getToastStyles = () => {
    switch (type) {
      case 'success':
        return 'bg-green-500 text-white border-green-600';
      case 'error':
        return 'bg-red-500 text-white border-red-600';
      case 'warning':
        return 'bg-yellow-500 text-white border-yellow-600';
      default:
        return 'bg-blue-500 text-white border-blue-600';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5" />;
      case 'error':
        return <XCircle className="h-5 w-5" />;
      default:
        return <CheckCircle className="h-5 w-5" />;
    }
  };

  return (
    <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg border-l-4 flex items-center gap-3 min-w-80 max-w-md animate-in slide-in-from-right duration-300 ${getToastStyles()}`}>
      {getIcon()}
      <span className="flex-1 text-sm font-medium">{message}</span>
      <button
        onClick={onClose}
        className="text-white hover:text-gray-200 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

// Toast Container Component
const ToastContainer = ({ toasts, removeToast }) => {
  return (
    <div className="fixed top-0 right-0 z-50 p-4 space-y-2">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
};

const adminLogout = () => ({ type: 'ADMIN_LOGOUT' });

const AdminMentorsApproval = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [mentors, setMentors] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMentor, setSelectedMentor] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [filterStatus, setFilterStatus] = useState("pending");
  const [toasts, setToasts] = useState([]);
  const [pagination, setPagination] = useState({
    total_mentors: 0,
    total_pages: 0,
    current_page: 1,
    page_size: 10,
    has_next: false,
    has_previous: false
  });

  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [mentorToReject, setMentorToReject] = useState(null);

  // Toast functions
  const addToast = (message, type = 'success') => {
    const id = Date.now() + Math.random();
    const newToast = { id, message, type };
    setToasts(prev => [...prev, newToast]);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  // Toast utility object
  const toast = {
    success: (message) => addToast(message, 'success'),
    error: (message) => addToast(message, 'error'),
    warning: (message) => addToast(message, 'warning'),
    info: (message) => addToast(message, 'info')
  };

  const fetchMentors = async (query = "", page = 1, status = "pending") => {
    try {
      setLoading(true);
      setIsSearching(true);
      
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: pagination.page_size.toString(),
        status: status,
      });
      
      if (query.trim()) {
        params.append('search', query.trim());
      }
      
      const response = await adminAxios.get(`mentors/?${params}`);
      
      setMentors(response.data.mentors || []);
      setPagination(response.data.pagination || pagination);
      setError(null);
    } catch (err) {
      setError(`Failed to fetch mentor applications: ${err.response?.data?.error || err.message}`);
      console.error("Fetch mentors error:", err);
      setMentors([]);
    } finally {
      setLoading(false);
      setIsSearching(false);
    }
  };

  // Single effect for both initial load and search with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchMentors(searchQuery, 1, filterStatus);
    }, searchQuery ? 500 : 0); // No delay for initial load, 500ms delay for search
    
    return () => clearTimeout(timeoutId);
  }, [searchQuery, filterStatus]);

  // Handle search input changes
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
  };

  // Clear search
  const handleClearSearch = () => {
    setSearchQuery("");
  };

  // Handle page change
  const handlePageChange = (newPage) => {
    fetchMentors(searchQuery, newPage, filterStatus);
  };

  // Handle status filter change
  const handleStatusFilterChange = (status) => {
    setFilterStatus(status);
    setSearchQuery("");
    setPagination(prev => ({ ...prev, current_page: 1 }));
  };

  const handleApproveMentor = async (mentorId) => {
    try {
      const response = await adminAxios.post(`mentors/${mentorId}/approve/`);
      
      setMentors(mentors.map(mentor => 
        mentor.id === mentorId 
          ? { ...mentor, approval_status: 'approved', approved_at: new Date().toISOString() }
          : mentor
      ));
      
      toast.success(response.data.message || "Mentor application approved successfully");
      
      // Refresh the list if we're filtering by pending
      if (filterStatus === "pending") {
        fetchMentors(searchQuery, pagination.current_page, filterStatus);
      }
    } catch (err) {
      toast.error(`Failed to approve mentor application: ${err.response?.data?.error || err.message}`);
      console.error("Approve mentor error:", err);
    }
  };

  const handleRejectMentor = async (mentorId, reason = "") => {
    try {
      console.log('Sending rejection request:', { mentorId, reason });
      
      const requestData = reason ? { rejection_reason: reason } : {};
      
      const response = await adminAxios.post(`mentors/${mentorId}/reject/`, requestData, {
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      setMentors(mentors.map(mentor => 
        mentor.id === mentorId 
          ? { ...mentor, approval_status: 'rejected', approved_at: new Date().toISOString() }
          : mentor
      ));
      
      toast.success(response.data.message || "Mentor application rejected");
      
      // Refresh the list if we're filtering by pending
      if (filterStatus === "pending") {
        fetchMentors(searchQuery, pagination.current_page, filterStatus);
      }
    } catch (err) {
      console.error("Reject mentor error details:", {
        status: err.response?.status,
        data: err.response?.data,
        message: err.message
      });
      toast.error(`Failed to reject mentor application: ${err.response?.data?.error || err.response?.data?.detail || err.message}`);
    }
  };

  const handleViewDetails = async (mentor) => {
    try {
      // Fetch detailed mentor information
      const response = await adminAxios.get(`mentors/${mentor.id}/`);
      setSelectedMentor(response.data);
      setIsDetailModalOpen(true);
    } catch (err) {
      console.error("Error fetching mentor details:", err);
      // Fallback to basic mentor info if detailed fetch fails
      setSelectedMentor(mentor);
      setIsDetailModalOpen(true);
    }
  };

  const handleLogout = async () => {
    try {
      await adminAxios.post('logout/');
      dispatch(adminLogout());
      toast.success('Logged out successfully');
      navigate('/admin/login');
    } catch (error) {
      console.error('Logout error:', error);
      // Even if logout API fails, clear local session
      dispatch(adminLogout());
      toast.success('Logged out successfully');
      navigate('/admin/login');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getExpertiseLevelColor = (level) => {
    switch (level?.toLowerCase()) {
      case 'beginner':
        return 'bg-blue-100 text-blue-800';
      case 'intermediate':
        return 'bg-green-100 text-green-800';
      case 'advanced':
        return 'bg-orange-100 text-orange-800';
      case 'expert':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };


// open the rejection modal
const openRejectModal = (mentor) => {
  setMentorToReject(mentor);
  setRejectionReason("");
  setIsRejectModalOpen(true);
};

// handle rejection with reason
const handleRejectWithReason = async () => {
  if (!rejectionReason.trim()) {
    toast.error("Please provide a reason for rejection");
    return;
  }
  
  await handleRejectMentor(mentorToReject.id, rejectionReason);
  setIsRejectModalOpen(false);
  setMentorToReject(null);
  setRejectionReason("");
};

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Toast Container */}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold">Mentor Applications</h1>
          
        </div>

        {/* Status Filter Tabs */}
        <div className="flex gap-2 mb-4">
          {[
            { key: 'pending', label: 'Pending', icon: Clock },
            { key: 'approved', label: 'Approved', icon: CheckCircle },
            { key: 'rejected', label: 'Rejected', icon: XCircle },
            { key: 'all', label: 'All', icon: User }
          ].map(({ key, label, icon: Icon }) => (
            <Button
              key={key}
              variant={filterStatus === key ? "default" : "outline"}
              onClick={() => handleStatusFilterChange(key)}
              className="flex items-center gap-2"
            >
              <Icon className="h-4 w-4" />
              {label}
            </Button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 h-5 w-5" />
            <Input
              type="text"
              placeholder="Search mentors by name or email..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="pl-10 pr-10"
            />
            {searchQuery && (
              <button
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
          {isSearching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900"></div>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-lg">Loading mentor applications...</p>
        </div>
      ) : error ? (
        <div className="text-center py-8 text-red-500">
          <p>{error}</p>
          <Button onClick={() => fetchMentors(searchQuery, pagination.current_page, filterStatus)} className="mt-4">
            Try Again
          </Button>
        </div>
      ) : mentors && mentors.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-lg text-gray-500">
            {searchQuery 
              ? "No mentor applications found matching your search." 
              : `No ${filterStatus === 'all' ? '' : filterStatus} mentor applications found.`
            }
          </p>
        </div>
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {mentors.map((mentor) => (
              <Card key={mentor.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4 mb-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={mentor.profile_image_url} alt={mentor.name} />
                      {/* <AvatarFallback>
                        {mentor.name?.charAt(0) || 'M'}
                      </AvatarFallback> */}
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg truncate">{mentor.name}</h3>
                      <p className="text-sm text-gray-500 truncate">{mentor.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={getStatusColor(mentor.approval_status)}>
                          {mentor.approval_status || 'pending'}
                        </Badge>
                        {mentor.expertise_level && (
                          <Badge className={getExpertiseLevelColor(mentor.expertise_level)}>
                            {mentor.expertise_level}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm">
                      {/* add subjects if needed */}
                      
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Award className="h-4 w-4 text-gray-400" />
                      <span>{mentor.experience || 'Experience not specified'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <DollarSign className="h-4 w-4 text-gray-400" />
                      <span>Rs.{mentor.hourly_rate || 0}/hour</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Clock className="h-4 w-4" />
                      <span>Submitted: {formatDate(mentor.submitted_at)}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewDetails(mentor)}
                      className="flex-1"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View Details
                    </Button>
                    {mentor.approval_status === 'pending' && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleApproveMentor(mentor.id)}
                          className="text-green-600 hover:text-green-900 hover:bg-green-50"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openRejectModal(mentor)}
                          className="text-red-600 hover:text-red-900 hover:bg-red-50"
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination Controls */}
          {pagination && pagination.total_pages > 1 && (
            <div className="mt-8 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {((pagination.current_page - 1) * pagination.page_size) + 1} to{" "}
                {Math.min(pagination.current_page * pagination.page_size, pagination.total_mentors)} of{" "}
                {pagination.total_mentors} applications
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.current_page - 1)}
                  disabled={!pagination.has_previous}
                  className="flex items-center"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <span className="text-sm text-gray-700">
                  Page {pagination.current_page} of {pagination.total_pages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.current_page + 1)}
                  disabled={!pagination.has_next}
                  className="flex items-center"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Detail Modal */}
      {isDetailModalOpen && selectedMentor && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-40">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-2xl font-bold">Mentor Application Details</h2>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsDetailModalOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <Avatar className="h-24 w-24">
                    <AvatarImage 
                      src={selectedMentor.profile_image_url} 
                      alt={selectedMentor.name} 
                    />
                    {/* <AvatarFallback className="text-lg">
                      {selectedMentor.name?.charAt(0) || 'M'}
                    </AvatarFallback> */}
                  </Avatar>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold">{selectedMentor.name}</h3>
                    <p className="text-gray-600">{selectedMentor.email}</p>
                    <div className="flex gap-2 mt-2">
                      <Badge className={getStatusColor(selectedMentor.approval_status)}>
                        {selectedMentor.approval_status || 'pending'}
                      </Badge>
                      {selectedMentor.expertise_level && (
                        <Badge className={getExpertiseLevelColor(selectedMentor.expertise_level)}>
                          {selectedMentor.expertise_level}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2">Experience</h4>
                    <p className="text-gray-600">{selectedMentor.experience || 'Not specified'}</p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Hourly Rate</h4>
                    <p className="text-gray-600">Rs.{selectedMentor.hourly_rate || 0}/hour</p>
                  </div>
                </div>

                {/* <div>
                  <h4 className="font-semibold mb-2">Subjects</h4>
                  <p className="text-gray-600">{selectedMentor.subjects || 'No subjects listed'}</p>
                </div> */}

                <div>
                  <h4 className="font-semibold mb-2">Biography</h4>
                  <p className="text-gray-600">{selectedMentor.bio || 'No biography provided'}</p>
                </div>

                {/* Additional fields from detailed view */}
                {selectedMentor.rating !== undefined && (
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <h4 className="font-semibold mb-2">Rating</h4>
                      <p className="text-gray-600">{selectedMentor.rating || 0}/5</p>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Total Sessions</h4>
                      <p className="text-gray-600">{selectedMentor.total_sessions || 0}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">Total Students</h4>
                      <p className="text-gray-600">{selectedMentor.total_students || 0}</p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 text-sm text-gray-500">
                  <div>
                    <strong>Submitted:</strong> {formatDate(selectedMentor.submitted_at)}
                  </div>
                  {selectedMentor.approved_at && (
                    <div>
                      <strong>Processed:</strong> {formatDate(selectedMentor.approved_at)}
                    </div>
                  )}
                </div>

                {selectedMentor.approved_by_name && (
                  <div className="text-sm text-gray-500">
                    <strong>Approved by:</strong> {selectedMentor.approved_by_name}
                  </div>
                )}

                {selectedMentor.approval_status === 'pending' && (
                  <div className="flex gap-3 pt-4 border-t">
                    <Button
                      onClick={() => {
                        handleApproveMentor(selectedMentor.id);
                        setIsDetailModalOpen(false);
                      }}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve Application
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        openRejectModal(selectedMentor);
                        setIsDetailModalOpen(false);
                      }}
                      className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject Application
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Rejection Modal */}
{isRejectModalOpen && mentorToReject && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
    <div className="bg-white rounded-lg max-w-md w-full">
      <div className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Reject Application</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsRejectModalOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <p className="text-gray-600 mb-4">
          Please provide a reason for rejecting {mentorToReject.name}'s application:
        </p>
        
        <textarea
          value={rejectionReason}
          onChange={(e) => setRejectionReason(e.target.value)}
          placeholder="Enter rejection reason..."
          className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          rows={4}
        />
        
        <div className="flex gap-3 mt-4">
          <Button
            variant="outline"
            onClick={() => setIsRejectModalOpen(false)}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleRejectWithReason}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white"
          >
            Reject Application
          </Button>
        </div>
      </div>
    </div>
  </div>
)}
    </div>
  );
};

export default AdminMentorsApproval;