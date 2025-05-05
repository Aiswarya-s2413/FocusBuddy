import React from "react";
import { Button } from "../ui/button";
import { LogOut, Trash2 } from "lucide-react";
import { useDispatch } from "react-redux";
import { logout } from "../../store/userSlice";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const AccountManagement = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      // Add withCredentials: true to include cookies in the request
      await axios.post("http://localhost:8000/api/user/logout/", {}, {
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
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <LogOut className="h-5 w-5" />
        <h2 className="text-xl font-semibold">Account Management</h2>
      </div>

      <div className="space-y-4">
        <Button 
          variant="outline" 
          className="w-full sm:w-auto"
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>

        <Button variant="destructive" className="w-full sm:w-auto">
          <Trash2 className="mr-2 h-4 w-4" />
          Delete Account
        </Button>
      </div>
    </div>
  );
};

export default AccountManagement;
