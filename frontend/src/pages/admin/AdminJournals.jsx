import React, { useState, useEffect, useCallback } from "react";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Search, Edit2, Ban, CheckCircle, X, ChevronLeft, ChevronRight, LogOut, Eye } from "lucide-react";
import { adminAxios } from '../../utils/axios';
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { adminLogout } from "../../store/adminSlice";
import debounce from "lodash/debounce";
import ViewJournalModal from "../../components/admin/ViewJournalModal";

const AdminJournals = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const [journals, setJournals] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedJournal, setSelectedJournal] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [pagination, setPagination] = useState({
    total_journals: 0,
    total_pages: 0,
    current_page: 1,
    page_size: 10,
    has_next: false,
    has_previous: false
  });

  const fetchJournals = async (query = "", page = 1) => {
    try {
      setLoading(true);
      setIsSearching(true);
      const response = await adminAxios.get(
        `/journals/?search=${query}&page=${page}&page_size=${pagination.page_size}`
      );
      setJournals(response.data.journals);
      setPagination(response.data.pagination);
      setError(null);
    } catch (err) {
      setError("Failed to fetch journals. Please try again.");
      toast.error("Failed to fetch journals");
    } finally {
      setLoading(false);
      setIsSearching(false);
    }
  };

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce((query) => {
      fetchJournals(query, 1); // Reset to first page on new search
    }, 500),
    []
  );

  useEffect(() => {
    fetchJournals();
  }, []);

  // Handle search input changes
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    debouncedSearch(value);
  };

  // Clear search
  const handleClearSearch = () => {
    setSearchQuery("");
    fetchJournals("", 1);
  };

  // Handle page change
  const handlePageChange = (newPage) => {
    fetchJournals(searchQuery, newPage);
  };

  const handleBlockJournal = async (journalId) => {
    try {
      const response = await adminAxios.post(`/journals/${journalId}/block/`);
      setJournals(journals.map(journal => 
        journal.id === journalId ? { ...journal, is_blocked: !journal.is_blocked } : journal
      ));
      toast.success(response.data.message);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to update journal status");
    }
  };

  const handleViewJournal = (journal) => {
    setSelectedJournal(journal);
    setIsViewModalOpen(true);
  };

  const handleLogout = async () => {
    try {
      // Set withCredentials to ensure cookies are included in the request
      await adminAxios.post('/logout/', {}, { withCredentials: true });
      
      // Dispatch the logout action to update Redux state
      dispatch(adminLogout());
      
      // Show success message
      toast.success('Logged out successfully');
      
      // Redirect to login page
      navigate('/admin/login');
    } catch (error) {
      console.error('Logout error:', error);
      
      // Even if API call fails, force logout on the client side
      dispatch(adminLogout());
      toast.success('Logged out successfully');
      navigate('/admin/login');
    }
  };

  // Sort journals by latest date
  const sortedJournals = journals ? journals.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)) : [];

  // Format date for display
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold">Journal Management</h1>
          <Button
            variant="outline"
            onClick={handleLogout}
            className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
        <div className="relative flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 h-5 w-5" />
            <Input
              type="text"
              placeholder="Search journals by user or mood..."
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
          <p className="text-lg">Loading journals...</p>
        </div>
      ) : error ? (
        <div className="text-center py-8 text-red-500">
          <p>{error}</p>
        </div>
      ) : journals && journals.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-lg text-gray-500">
            {searchQuery ? "No journals found matching your search." : "No journals found."}
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Mood
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedJournals.map((journal) => (
                  <tr key={journal.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{journal.user.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{formatDate(journal.date)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span 
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          journal.mood === 'happy' || journal.mood === 'excited' 
                            ? 'bg-green-100 text-green-800'
                            : journal.mood === 'neutral'
                            ? 'bg-blue-100 text-blue-800'
                            : journal.mood === 'sad' || journal.mood === 'anxious'
                            ? 'bg-yellow-100 text-yellow-800'
                            : journal.mood === 'angry'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {journal.mood.charAt(0).toUpperCase() + journal.mood.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{formatDate(journal.created_at)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          !journal.is_blocked
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {!journal.is_blocked ? "Active" : "Blocked"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewJournal(journal)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleBlockJournal(journal.id)}
                          className={!journal.is_blocked ? "text-red-600 hover:text-red-900" : "text-green-600 hover:text-green-900"}
                        >
                          {!journal.is_blocked ? (
                            <>
                              <Ban className="h-4 w-4 mr-1" />
                              Block
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Unblock
                            </>
                          )}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {pagination && <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {((pagination.current_page - 1) * pagination.page_size) + 1} to{" "}
              {Math.min(pagination.current_page * pagination.page_size, pagination.total_journals)} of{" "}
              {pagination.total_journals} journals
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
          </div>}
        </>
      )}

      {/* View Journal Modal */}
      <ViewJournalModal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedJournal(null);
        }}
        journal={selectedJournal}
      />
    </div>
  );
};

export default AdminJournals;