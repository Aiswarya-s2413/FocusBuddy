import React, { useState, useEffect, useCallback } from "react";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Search, Edit2, Ban, CheckCircle, X, ChevronLeft, ChevronRight, LogOut } from "lucide-react";
import { adminAxios } from '../../utils/axios';
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { adminLogout } from "../../store/adminSlice";
import EditUserModal from "../../components/admin/EditUserModal";
import debounce from "lodash/debounce";

const AdminUsers = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [pagination, setPagination] = useState({
    total_users: 0,
    total_pages: 0,
    current_page: 1,
    page_size: 10,
    has_next: false,
    has_previous: false
  });

  const fetchUsers = async (query = "", page = 1) => {
    try {
      setLoading(true);
      setIsSearching(true);
      const response = await adminAxios.get(
        `/users/?search=${query}&page=${page}&page_size=${pagination.page_size}`
      );
      setUsers(response.data.users);
      setPagination(response.data.pagination);
      setError(null);
    } catch (err) {
      setError("Failed to fetch users. Please try again.");
      toast.error("Failed to fetch users");
    } finally {
      setLoading(false);
      setIsSearching(false);
    }
  };

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce((query) => {
      fetchUsers(query, 1); // Reset to first page on new search
    }, 500),
    []
  );

  useEffect(() => {
    fetchUsers();
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
    fetchUsers("", 1);
  };

  // Handle page change
  const handlePageChange = (newPage) => {
    fetchUsers(searchQuery, newPage);
  };

  const handleBlockUser = async (userId) => {
    try {
      const response = await adminAxios.post(`/users/${userId}/block/`);
      setUsers(users.map(user => 
        user.id === userId ? { ...user, is_active: !user.is_active } : user
      ));
      toast.success(response.data.message);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to update user status");
    }
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setIsEditModalOpen(true);
  };

  const handleUserUpdated = (updatedUser) => {
    console.log("Received updated user data:", updatedUser);
    console.log("Current users list:", users);
    
    setUsers(users.map(user => {
      if (user.id === updatedUser.id) {
        console.log("Updating user:", user.id);
        return { ...user, ...updatedUser };
      }
      return user;
    }));
    
    // Force a re-fetch of users to ensure we have the latest data
    fetchUsers(searchQuery, pagination.current_page);
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
      dispatch(manualLogout());
      toast.success('Logged out successfully');
      navigate('/admin/login');
    }
  };

  // After fetching users:
  // Filter out mentors and sort by latest
  const onlyUsers = users?users.filter(user => !user.is_mentor):[];
  const sortedUsers = onlyUsers.sort((a, b) => new Date(b.date_joined) - new Date(a.date_joined));

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
      <div className="flex justify-between items-center mb-4">
  <h1 className="text-3xl font-bold">User Management</h1>
  <div className="flex gap-3">
    <Button
      variant="outline"
      onClick={() => navigate("/admin/mentors")}
      className="flex items-center gap-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
    >
      <span>Mentor requests</span>
    </Button>
    <Button
      variant="outline"
      onClick={handleLogout}
      className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
    >
      <LogOut className="h-4 w-4" />
      Logout
    </Button>
  </div>
</div>
        <div className="relative flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 h-5 w-5" />
            <Input
              type="text"
              placeholder="Search users by name or email..."
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
          <p className="text-lg">Loading users...</p>
        </div>
      ) : error ? (
        <div className="text-center py-8 text-red-500">
          <p>{error}</p>
        </div>
      ) : users&&users.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-lg text-gray-500">
            {searchQuery ? "No users found matching your search." : "No users found."}
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Subjects
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
                {sortedUsers.map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{user.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-500">
                        {user.subjects?.join(", ") || "No subjects selected"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          user.is_active
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {user.is_active ? "Active" : "Blocked"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditUser(user)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit2 className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleBlockUser(user.id)}
                          className={user.is_active ? "text-red-600 hover:text-red-900" : "text-green-600 hover:text-green-900"}
                        >
                          {user.is_active ? (
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
              {Math.min(pagination.current_page * pagination.page_size, pagination.total_users)} of{" "}
              {pagination.total_users} users
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

      <EditUserModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedUser(null);
        }}
        user={selectedUser}
        onUserUpdated={handleUserUpdated}
      />
    </div>
  );
};

export default AdminUsers;
