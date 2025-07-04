import React, { useState, useEffect } from "react";
import MentorHeader from "../../components/mentors/MentorHeader";
import MentorGrid from "../../components/mentors/MentorGrid";
import MentorProfileModal from "../../components/mentors/MentorProfileModal";
import { userAxios } from "../../utils/axios"; 
import { useSimpleToast } from "../../components/ui/toast";

const Mentors = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    subjects: [],
    experience: [], // Changed from expertise_level to experience
    rating: 0,
    hourly_rate: [0, 1000]
  });
  const [selectedMentor, setSelectedMentor] = useState(null);
  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { toast, ToastContainer } = useSimpleToast();

  // Helper function to convert experience range to backend format
  const convertExperienceToRange = (experienceRanges) => {
    const ranges = [];
    
    experienceRanges.forEach(range => {
      switch(range) {
        case "0-1 years":
          ranges.push({ min: 0, max: 1 });
          break;
        case "1-2 years":
          ranges.push({ min: 1, max: 2 });
          break;
        case "2-5 years":
          ranges.push({ min: 2, max: 5 });
          break;
        case "5+ years":
          ranges.push({ min: 5, max: 999 });
          break;
        default:
          break;
      }
    });
    
    return ranges;
  };

  // Fetch mentors from backend using userAxios
  const fetchMentors = async (query = "", currentFilters = filters) => {
    try {
      setLoading(true);
      setError(null);

      console.log("Fetching mentors with:", { query, currentFilters });

      // Build query parameters
      const params = new URLSearchParams();
      
      if (query && query.trim()) {
        params.append('search', query.trim());
      }
      
      // Handle subjects array
      if (currentFilters.subjects && Array.isArray(currentFilters.subjects) && currentFilters.subjects.length > 0) {
        params.append('subjects', currentFilters.subjects.join(','));
      }
      
      // Handle experience ranges - convert to min/max experience
      if (currentFilters.experience && Array.isArray(currentFilters.experience) && currentFilters.experience.length > 0) {
        const experienceRanges = convertExperienceToRange(currentFilters.experience);
        
        if (experienceRanges.length > 0) {
          // Find the overall min and max from all selected ranges
          const allMins = experienceRanges.map(r => r.min);
          const allMaxs = experienceRanges.map(r => r.max);
          
          const minExperience = Math.min(...allMins);
          const maxExperience = Math.max(...allMaxs);
          
          params.append('min_experience', minExperience.toString());
          if (maxExperience !== 999) { // Don't set max if it's the "5+ years" case
            params.append('max_experience', maxExperience.toString());
          }
        }
      }
      
      // Handle rating
      if (currentFilters.rating && currentFilters.rating > 0) {
        params.append('rating', currentFilters.rating.toString());
      }
      
      // Handle hourly rate range
      if (currentFilters.hourly_rate && Array.isArray(currentFilters.hourly_rate) && currentFilters.hourly_rate.length === 2) {
        const [minRate, maxRate] = currentFilters.hourly_rate;
        if (typeof minRate === 'number' && typeof maxRate === 'number') {
          params.append('min_hourly_rate', minRate.toString());
          params.append('max_hourly_rate', maxRate.toString());
        }
      }

      const queryString = params.toString();
      const url = queryString ? `mentors/?${queryString}` : 'mentors/';
      
      console.log("Making request to:", url);

      // Use userAxios instead of fetch - it handles auth automatically
      const response = await userAxios.get(url);
      
      console.log("Response received:", response);
      
      // userAxios returns response.data directly
      const data = response.data;
      
      if (data && data.success) {
        console.log("Mentors fetched successfully:", data.data);
        setMentors(data.data || []);
      } else {
        console.error("API returned error:", data);
        throw new Error(data?.error || 'Failed to fetch mentors');
      }
    } catch (err) {
      console.error('Error fetching mentors:', err);
      
      // More detailed error logging
      if (err.response) {
        console.error('Error response:', {
          status: err.response.status,
          statusText: err.response.statusText,
          data: err.response.data,
          headers: err.response.headers
        });
      }
      
      // Handle different error scenarios
      let errorMessage = 'Failed to fetch mentors';
      
      if (err.response?.status === 401) {
        errorMessage = 'Please log in to view mentors';
      } else if (err.response?.status === 403) {
        errorMessage = 'You do not have permission to view mentors';
      } else if (err.response?.status === 500) {
        errorMessage = err.response?.data?.error || 'Server error - please try again later';
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      setMentors([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch mentor details when viewing profile using userAxios
  const fetchMentorDetails = async (mentorId) => {
    try {
      console.log("Fetching mentor details for ID:", mentorId);
      
      if (!mentorId) {
        throw new Error('Invalid mentor ID');
      }
      
      // Use userAxios for authenticated requests
      const response = await userAxios.get(`mentors/${mentorId}/`);
      
      console.log("Mentor details response:", response);
      
      const data = response.data;
      
      if (data && data.success) {
        console.log("Mentor details fetched successfully:", data.data);
        return data.data;
      } else {
        console.error("API returned error for mentor details:", data);
        throw new Error(data?.error || 'Failed to fetch mentor details');
      }
    } catch (err) {
      console.error('Error fetching mentor details:', err);
      
      if (err.response) {
        console.error('Error response for mentor details:', {
          status: err.response.status,
          statusText: err.response.statusText,
          data: err.response.data
        });
      }
      
      if (err.response?.status === 401) {
        throw new Error('Please log in to view mentor details');
      } else if (err.response?.status === 403) {
        throw new Error('You do not have permission to view this mentor');
      } else if (err.response?.status === 404) {
        throw new Error('Mentor not found');
      } else {
        throw new Error(err.response?.data?.error || err.message || 'Failed to fetch mentor details');
      }
    }
  };

  // Initial load
  useEffect(() => {
    console.log("Component mounted, fetching mentors...");
    fetchMentors();
  }, []);

  const handleSearch = (query) => {
    console.log("Search triggered with query:", query);
    setSearchQuery(query);
    fetchMentors(query, filters);
  };

  const handleFilterChange = (newFilters) => {
    console.log("Filters changed:", newFilters);
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    fetchMentors(searchQuery, updatedFilters);
  };

  const handleViewProfile = async (mentor) => {
    try {
      console.log("Viewing profile for mentor:", mentor);
      
      if (!mentor || !mentor.id) {
        throw new Error('Invalid mentor data');
      }
      
      // Fetch detailed mentor information
      const detailedMentor = await fetchMentorDetails(mentor.id);
      setSelectedMentor(detailedMentor);
    } catch (err) {
      // If detailed fetch fails, show error or use basic mentor data
      console.warn('Failed to fetch detailed mentor info:', err);
      
      // You can either show an error message or use basic data
      if (err.message.includes('log in')) {
        setError('Please log in to view mentor profiles');
      } else {
        // Use basic mentor data as fallback
        console.log("Using basic mentor data as fallback");
        setSelectedMentor(mentor);
      }
    }
  };

  const handleCloseModal = () => {
    setSelectedMentor(null);
  };

  const handleRetry = () => {
    console.log("Retrying fetch mentors...");
    fetchMentors(searchQuery, filters);
  };

  // Loading state
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <MentorHeader
          onSearch={handleSearch}
          onFilterChange={handleFilterChange}
        />
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading mentors...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <MentorHeader
          onSearch={handleSearch}
          onFilterChange={handleFilterChange}
        />
        <div className="text-center py-12">
          <div className="text-red-500 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.728-.833-2.498 0L4.316 15.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Error loading mentors
          </h3>
          <p className="text-gray-500 mb-4">{error}</p>
          <div className="space-x-4">
            <button
              onClick={handleRetry}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
            {error.includes('log in') && (
              <button
                onClick={() => window.location.href = '/login'}
                className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors"
              >
                Go to Login
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <MentorHeader
        onSearch={handleSearch}
        onFilterChange={handleFilterChange}
      />

      {mentors.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No mentors found
          </h3>
          <p className="text-gray-500">
            Try adjusting your search or filters to find more mentors.
          </p>
        </div>
      ) : (
        <MentorGrid mentors={mentors} onViewProfile={handleViewProfile} />
      )}

      {selectedMentor && (
        <MentorProfileModal
          mentor={selectedMentor}
          isOpen={!!selectedMentor}
          onClose={handleCloseModal}
          toast={toast}
        />
      )}
       <ToastContainer />
    </div>
  );
};

export default Mentors;