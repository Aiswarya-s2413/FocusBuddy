import React, { useState, useEffect } from "react";
import MentorHeader from "../../components/mentors/MentorHeader";
import MentorGrid from "../../components/mentors/MentorGrid";
import MentorProfileModal from "../../components/mentors/MentorProfileModal";
import { userAxios } from "../../utils/axios"; 

const Mentors = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    subjects: [],
    expertise_level: [],
    rating: 0,
    hourly_rate: [0, 100]
  });
  const [selectedMentor, setSelectedMentor] = useState(null);
  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch mentors from backend using userAxios
  const fetchMentors = async (query = "", currentFilters = filters) => {
    try {
      setLoading(true);
      setError(null);

      // Build query parameters
      const params = new URLSearchParams();
      
      if (query.trim()) {
        params.append('search', query);
      }
      
      if (currentFilters.subjects && currentFilters.subjects.length > 0) {
        params.append('subjects', currentFilters.subjects.join(','));
      }
      
      if (currentFilters.expertise_level && currentFilters.expertise_level.length > 0) {
        currentFilters.expertise_level.forEach(level => {
          params.append('expertise_level', level);
        });
      }
      
      if (currentFilters.rating > 0) {
        params.append('rating', currentFilters.rating.toString());
      }
      
      if (currentFilters.hourly_rate) {
        const [minRate, maxRate] = currentFilters.hourly_rate;
        params.append('min_hourly_rate', minRate.toString());
        params.append('max_hourly_rate', maxRate.toString());
      }

      // Use userAxios instead of fetch - it handles auth automatically
      const response = await userAxios.get(`mentors/?${params.toString()}`);
      
      // userAxios returns response.data directly
      const data = response.data;
      
      if (data.success) {
        setMentors(data.data);
      } else {
        throw new Error(data.error || 'Failed to fetch mentors');
      }
    } catch (err) {
      console.error('Error fetching mentors:', err);
      
      // Handle different error scenarios
      if (err.response?.status === 401) {
        setError('Please log in to view mentors');
        // Optionally redirect to login
        // window.location.href = '/login';
      } else if (err.response?.status === 403) {
        setError('You do not have permission to view mentors');
      } else {
        setError(err.response?.data?.error || err.message || 'Failed to fetch mentors');
      }
      
      setMentors([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch mentor details when viewing profile using userAxios
  const fetchMentorDetails = async (mentorId) => {
    try {
      // Use userAxios for authenticated requests
      const response = await userAxios.get(`mentors/${mentorId}/`);
      
      const data = response.data;
      
      if (data.success) {
        return data.data;
      } else {
        throw new Error(data.error || 'Failed to fetch mentor details');
      }
    } catch (err) {
      console.error('Error fetching mentor details:', err);
      
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
    fetchMentors();
  }, []);

  const handleSearch = (query) => {
    setSearchQuery(query);
    fetchMentors(query, filters);
  };

  const handleFilterChange = (newFilters) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    fetchMentors(searchQuery, updatedFilters);
  };

  const handleViewProfile = async (mentor) => {
    try {
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
        setSelectedMentor(mentor);
      }
    }
  };

  const handleCloseModal = () => {
    setSelectedMentor(null);
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
              onClick={() => fetchMentors(searchQuery, filters)}
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
        />
      )}
    </div>
  );
};

export default Mentors;