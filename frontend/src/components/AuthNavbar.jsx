import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Button } from "../components/ui/button";
import { Clock, Calendar, BarChart2, Book, Settings, LogOut } from "lucide-react";
import { cn } from "../lib/utils";
import { useDispatch } from "react-redux";
import { logout } from "../store/userSlice";
import axios from 'axios';


const AuthNavbar = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      // Add withCredentials: true to include cookies in the request
      await axios.post("https://api.focusbuddy.aiswaryasathyan.space/api/user/logout/", {}, {
        withCredentials: true
      });
      dispatch(logout());
      navigate("/login");
    } catch (error) {
      console.error("Logout failed:", error);
      // Still proceed with frontend logout even if backend call fails
      dispatch(logout());
      navigate("/login");
    }
  };

  return (
    <header className="bg-white shadow-sm sticky top-0 z-10">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-600">
            FocusBuddy
          </div>

          <nav className="hidden md:flex items-center space-x-4">
            <NavLink
              to="/pomodoro"
              className={({ isActive }) => cn(
                "flex items-center px-3 py-2 rounded-md text-sm font-medium",
                isActive
                  ? "bg-[#F8F6FB] text-[#7E69AB]"
                  : "text-gray-600 hover:text-[#7E69AB] hover:bg-[#F8F6FB]"
              )}
            >
              <Clock className="h-4 w-4 mr-2" />
              Pomodoro
            </NavLink>

            <NavLink
              to="/focus-buddy"
              className={({ isActive }) => cn(
                "flex items-center px-3 py-2 rounded-md text-sm font-medium",
                isActive
                  ? "bg-[#F8F6FB] text-[#7E69AB]"
                  : "text-gray-600 hover:text-[#7E69AB] hover:bg-[#F8F6FB]"
              )}
            >
              <Clock className="h-4 w-4 mr-2" />
              Focus Buddy
            </NavLink>

            <NavLink
              to="/sessions"
              className={({ isActive }) => cn(
                "flex items-center px-3 py-2 rounded-md text-sm font-medium",
                isActive
                  ? "bg-[#F8F6FB] text-[#7E69AB]"
                  : "text-gray-600 hover:text-[#7E69AB] hover:bg-[#F8F6FB]"
              )}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Sessions
            </NavLink>

            <NavLink
              to="/mentors"
              className={({ isActive }) => cn(
                "flex items-center px-3 py-2 rounded-md text-sm font-medium",
                isActive
                  ? "bg-[#F8F6FB] text-[#7E69AB]"
                  : "text-gray-600 hover:text-[#7E69AB] hover:bg-[#F8F6FB]"
              )}
            >
              <BarChart2 className="h-4 w-4 mr-2" />
              Mentors
            </NavLink>

            <NavLink
              to="/journal"
              className={({ isActive }) => cn(
                "flex items-center px-3 py-2 rounded-md text-sm font-medium",
                isActive
                  ? "bg-[#F8F6FB] text-[#7E69AB]"
                  : "text-gray-600 hover:text-[#7E69AB] hover:bg-[#F8F6FB]"
              )}
            >
              <Book className="h-4 w-4 mr-2" />
              Journal
            </NavLink>

            <NavLink
              to="/history"
              className={({ isActive }) => cn(
                "flex items-center px-3 py-2 rounded-md text-sm font-medium",
                isActive
                  ? "bg-[#F8F6FB] text-[#7E69AB]"
                  : "text-gray-600 hover:text-[#7E69AB] hover:bg-[#F8F6FB]"
              )}
            >
              <Settings className="h-4 w-4 mr-2" />
              History
            </NavLink>

            <NavLink
              to="/settings"
              className={({ isActive }) => cn(
                "flex items-center px-3 py-2 rounded-md text-sm font-medium",
                isActive
                  ? "bg-[#F8F6FB] text-[#7E69AB]"
                  : "text-gray-600 hover:text-[#7E69AB] hover:bg-[#F8F6FB]"
              )}
            >
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </NavLink>

            <Button
              variant="ghost"
              onClick={handleLogout}
              className="flex items-center text-gray-600 hover:text-[#7E69AB] hover:bg-[#F8F6FB]"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </nav>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <Button variant="ghost" className="p-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default AuthNavbar;
