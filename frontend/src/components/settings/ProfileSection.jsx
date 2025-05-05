import React, { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { User, Save } from "lucide-react";
import { useSelector, useDispatch } from "react-redux";
import { updateProfile } from "../../store/userSlice";

const ProfileSection = () => {
  const dispatch = useDispatch();
  const { user, loading, error, message } = useSelector((state) => state.user);
  const [name, setName] = useState(user?.name || "");
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = async () => {
    if (name === user?.name) {
      setIsEditing(false);
      return;
    }
    
    try {
      await dispatch(updateProfile(name)).unwrap();
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update profile:", error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <User className="h-5 w-5" />
        <h2 className="text-xl font-semibold">Edit Profile</h2>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="fullName">Full Name</Label>
          <div className="flex gap-2">
            <Input 
              id="fullName" 
              placeholder="Your full name" 
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setIsEditing(true);
              }}
              disabled={loading}
            />
            {isEditing && (
              <Button 
                onClick={handleSave}
                disabled={loading}
                className="bg-purple-600 hover:bg-purple-700"
              >
                <Save className="h-4 w-4 mr-2" />
                {loading ? "Saving..." : "Save"}
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input 
            id="email" 
            type="email" 
            placeholder="your.email@example.com" 
            value={user?.email || ""}
            readOnly
            className="bg-gray-100"
          />
        </div>

        <div>
          <Button variant="outline" className="w-full sm:w-auto">
            Change Password
          </Button>
        </div>

        {error && (
          <p className="text-sm text-red-500">
            {typeof error === 'object' ? error.message || Object.values(error)[0] : error}
          </p>
        )}
        {message && (
          <p className="text-sm text-green-500">{message}</p>
        )}
      </div>
    </div>
  );
};

export default ProfileSection;
