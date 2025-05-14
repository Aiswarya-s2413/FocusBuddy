import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { LogOut } from "lucide-react";
import axios from "axios";

const MentorProfile = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await axios.post("http://localhost:8000/api/mentor/logout/");
      // Clear any stored data
      localStorage.removeItem("user");
      // Navigate to login page
      navigate("/mentor/login");
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  return (
    <div className="p-4">
      <Button
        onClick={handleLogout}
        variant="destructive"
        className="flex items-center gap-2"
      >
        <LogOut className="h-4 w-4" />
        Logout
      </Button>
    </div>
  );
};

export default MentorProfile;
