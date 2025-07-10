import React from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import { LogOut, User, Wallet, Star } from "lucide-react";
import { useToast } from "../../hooks/use-toast";
import axios from "axios";

const MentorNavbar = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      // Make sure withCredentials is true to send cookies with the request
      await axios.post(
        "http://localhost:8000/api/mentor/logout/",
        {},
        {
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json',
            // Adding these headers can help ensure cookies are properly sent
            'X-Requested-With': 'XMLHttpRequest'
          }
        }
      );

      toast({
        title: "Logged out",
        description: "You have been successfully logged out."
      });

      // Clear any local state related to authentication if needed
      localStorage.removeItem('mentorInfo'); // If you store any auth info in localStorage
      sessionStorage.removeItem('mentorInfo'); // If you store any auth info in sessionStorage

      navigate("/mentor/login");
    } catch (err) {
      console.error("Logout failed", err);

      // Even if the server logout fails, we can still clear client-side auth data
      // and redirect to login page
      localStorage.removeItem('mentorInfo');
      sessionStorage.removeItem('mentorInfo');

      // Show a toast but still redirect to login
      toast({
        title: "Warning",
        description: "Logout may not be complete on server, but you've been redirected to login."
      });

      // Still redirect to login page even if server logout failed
      navigate("/mentor/login");
    }
  };



  return (
    <nav className="bg-white shadow-md px-6 py-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center">
        <div className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-600">
            FocusBuddy Mentors
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* My Profile NavLink */}
          <NavLink
            to="/mentor/profile-display"
            className={({ isActive }) =>
              `flex items-center space-x-2 px-4 py-2 rounded-md transition-colors duration-200 ${
                isActive
                  ? 'text-blue-600 bg-blue-50'
                  : 'text-gray-700 hover:text-blue-600 hover:bg-gray-100'
              }`
            }
          >
            <User size={18} />
            <span>My Profile</span>
          </NavLink>

          {/* Wallet NavLink */}
          <NavLink
            to="/mentor/wallet"
            className={({ isActive }) =>
              `flex items-center space-x-2 px-4 py-2 rounded-md transition-colors duration-200 ${
                isActive
                  ? 'text-green-600 bg-green-50'
                  : 'text-gray-700 hover:text-green-600 hover:bg-gray-100'
              }`
            }
          >
            <Wallet size={18} />
            <span>Wallet</span>
          </NavLink>

          {/* Feedback NavLink */}
          <NavLink
            to="/mentor/feedback"
            className={({ isActive }) =>
              `flex items-center space-x-2 px-4 py-2 rounded-md transition-colors duration-200 ${
                isActive
                  ? 'text-yellow-600 bg-yellow-50'
                  : 'text-gray-700 hover:text-yellow-600 hover:bg-yellow-100'
              }`
            }
          >
            <Star size={18} />
            <span>Feedback</span>
          </NavLink>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="flex items-center space-x-2 px-4 py-2 text-gray-700 hover:text-red-600 hover:bg-gray-100 rounded-md transition-colors duration-200"
          >
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </div>
    </nav>
  );
};

export default MentorNavbar;