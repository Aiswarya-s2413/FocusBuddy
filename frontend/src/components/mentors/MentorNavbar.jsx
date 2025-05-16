import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut } from "lucide-react";
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
    <header className="bg-white shadow-sm sticky top-0 z-10">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-600">
            FocusBuddy Mentors
          </div>
          
          <button 
            onClick={handleLogout} 
            className="flex items-center px-3 py-2 rounded-md text-gray-600 hover:text-[#7E69AB] hover:bg-[#F8F6FB]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 mr-2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            Logout
          </button>
        </div>
      </div>
    </header>
  );
};

export default MentorNavbar;