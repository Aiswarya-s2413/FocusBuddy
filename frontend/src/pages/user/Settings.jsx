import React, { useState, useEffect } from "react";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../components/ui/dialog";
import { useSimpleToast } from "../../components/ui/toast";
import { userAxios } from "../../utils/axios";
import {
  User,
  Key,
  LogOut,
  Trash2,
  Clock,
  Users,
  Book,
  Calendar,
  TrendingUp,
  Edit,
  Shield,
  Settings as SettingsIcon,
  Loader2,
  Eye,
  EyeOff,
  AlertTriangle,
} from "lucide-react";

const Settings = () => {
  const { toast, ToastContainer } = useSimpleToast();
  
  // User data state
  const [user, setUser] = useState({
    name: "",
    email: "",
    phone: "",
    bio: "",
    experience: "",
    subjects: [],
    date_joined: "",
    is_mentor: false
  });
  
  // UI states
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  // Password modal states
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Password visibility states
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Delete account modal states
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  // Stats state
  const [userStats, setUserStats] = useState({
    pomodoro_sessions: 0,
    focus_buddy_sessions: 0,
    journals_created: 0,
    daily_streak: 0,
    total_tasks: 0,
    completed_tasks: 0,
    mentor_sessions: 0,
  });

  // Fetch user data and stats on component mount
  useEffect(() => {
    fetchUserData();
    fetchUserStats();
  }, []);

  const fetchUserData = async () => {
    try {
      const response = await userAxios.get('user-settings/');
      setUser(response.data.data);
      setTempName(response.data.data.name);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching user data:', error);
      toast.error('Failed to load user data');
      setIsLoading(false);
    }
  };

  const fetchUserStats = async () => {
    try {
      const response = await userAxios.get('user-settings/stats/');
      setUserStats(response.data.data);
    } catch (error) {
      console.error('Error fetching user stats:', error);
      toast.error('Failed to load user statistics');
    }
  };

  const handleNameSave = async () => {
    if (!tempName.trim()) {
      toast.error('Name cannot be empty');
      return;
    }

    setIsUpdating(true);
    try {
      const response = await userAxios.patch('user-settings/', {
        name: tempName.trim()
      });
      
      setUser(response.data.data);
      setIsEditingName(false);
      toast.success("Name updated successfully!");
    } catch (error) {
      console.error('Error updating name:', error);
      toast.error(error.response?.data?.detail || 'Failed to update name');
      setTempName(user.name); // Reset to original name
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Please fill in all password fields.");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters long.");
      return;
    }

    setIsChangingPassword(true);
    try {
      await userAxios.post('user-settings/password/', {
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword
      });

      setIsPasswordModalOpen(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      // Reset visibility states
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
      toast.success("Password changed successfully!");
    } catch (error) {
      console.error('Error changing password:', error);
      const errorMessage = error.response?.data?.current_password?.[0] || 
                          error.response?.data?.new_password?.[0] || 
                          error.response?.data?.non_field_errors?.[0] ||
                          'Failed to change password';
      toast.error(errorMessage);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleLogout = async () => {
    try {
      await userAxios.post('/logout/');
      toast.success("Logged out successfully!");
      // Redirect to login page after a brief delay
      setTimeout(() => {
        window.location.href = '/login';
      }, 1000);
    } catch (error) {
      console.error('Error logging out:', error);
      toast.error('Failed to logout');
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText.toLowerCase() !== 'delete my account') {
      toast.error('Please type "DELETE MY ACCOUNT" to confirm');
      return;
    }

    setIsDeletingAccount(true);
    try {
      await userAxios.delete('user-settings/delete-account/');
      toast.success("Account deleted successfully!");
      setIsDeleteModalOpen(false);
      // Redirect to home page after a brief delay
      setTimeout(() => {
        window.location.href = '/';
      }, 1000);
    } catch (error) {
      console.error('Error deleting account:', error);
      toast.error('Failed to delete account');
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const togglePasswordVisibility = (field) => {
    switch (field) {
      case 'current':
        setShowCurrentPassword(!showCurrentPassword);
        break;
      case 'new':
        setShowNewPassword(!showNewPassword);
        break;
      case 'confirm':
        setShowConfirmPassword(!showConfirmPassword);
        break;
      default:
        break;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8F6FB] flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-[#9b87f5]" />
          <span className="text-[#6E59A5] font-medium">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F6FB]">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-[#9b87f5] rounded-xl shadow-lg">
              <SettingsIcon className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-[#6E59A5]">Settings</h1>
              <p className="text-gray-600 mt-1">
                Manage your account and view your progress
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Profile Section */}
        <Card className="bg-white rounded-xl shadow-sm">
          <div className="p-8">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-[#9b87f5] rounded-xl shadow-lg">
                <User className="h-6 w-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-[#6E59A5]">
                Profile Information
              </h2>
            </div>

            <div className="space-y-6">
              {/* Name Section */}
              <div className="bg-[#F0EBFF] rounded-xl p-6 border border-gray-200">
                <Label className="text-sm font-semibold text-[#6E59A5] uppercase tracking-wide mb-3 block">
                  Full Name
                </Label>
                {isEditingName ? (
                  <div className="flex items-center gap-3">
                    <Input
                      value={tempName}
                      onChange={(e) => setTempName(e.target.value)}
                      disabled={isUpdating}
                      className="flex-1 bg-white border-gray-300 focus:border-[#9b87f5] focus:ring-2 focus:ring-[#9b87f5]/20 rounded-xl"
                    />
                    <Button
                      size="sm"
                      onClick={handleNameSave}
                      disabled={isUpdating}
                      className="bg-[#9b87f5] hover:bg-[#7E69AB] text-white px-6 rounded-xl shadow-lg"
                    >
                      {isUpdating ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Saving...
                        </>
                      ) : (
                        'Save'
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setIsEditingName(false);
                        setTempName(user.name);
                      }}
                      disabled={isUpdating}
                      className="border-gray-300 text-gray-600 hover:bg-gray-50 rounded-xl"
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <p className="text-xl font-semibold text-gray-900">
                      {user.name}
                    </p>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setIsEditingName(true)}
                      className="h-10 w-10 p-0 hover:bg-[#9b87f5]/10 text-[#6E59A5] rounded-xl"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Email Section (Read-only) */}
              <div className="bg-[#F0EBFF] rounded-xl p-6 border border-gray-200">
                <Label className="text-sm font-semibold text-[#6E59A5] uppercase tracking-wide mb-3 block">
                  Email Address
                </Label>
                <p className="text-xl font-semibold text-gray-900">{user.email}</p>
                <p className="text-sm text-gray-500 mt-1">Email cannot be changed</p>
              </div>

              {/* Password Change Button */}
              <div>
                <Dialog
                  open={isPasswordModalOpen}
                  onOpenChange={(open) => {
                    setIsPasswordModalOpen(open);
                    if (!open) {
                      // Reset all states when modal closes
                      setCurrentPassword("");
                      setNewPassword("");
                      setConfirmPassword("");
                      setShowCurrentPassword(false);
                      setShowNewPassword(false);
                      setShowConfirmPassword(false);
                    }
                  }}
                >
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="border-gray-300 text-gray-700 hover:bg-[#F0EBFF] hover:border-[#9b87f5] transition-all duration-200 rounded-xl"
                    >
                      <Key className="mr-2 h-4 w-4" />
                      Change Password
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[450px] bg-white rounded-2xl">
                    <DialogHeader>
                      <DialogTitle className="text-xl font-bold text-[#6E59A5]">
                        Change Password
                      </DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-5 py-4">
                      {[
                        {
                          label: "Current Password",
                          value: currentPassword,
                          setValue: setCurrentPassword,
                          showPassword: showCurrentPassword,
                          toggleVisibility: () => togglePasswordVisibility('current'),
                        },
                        {
                          label: "New Password",
                          value: newPassword,
                          setValue: setNewPassword,
                          showPassword: showNewPassword,
                          toggleVisibility: () => togglePasswordVisibility('new'),
                        },
                        {
                          label: "Confirm New Password",
                          value: confirmPassword,
                          setValue: setConfirmPassword,
                          showPassword: showConfirmPassword,
                          toggleVisibility: () => togglePasswordVisibility('confirm'),
                        },
                      ].map((field, idx) => (
                        <div key={idx} className="space-y-2">
                          <Label className="text-sm font-semibold text-gray-700">
                            {field.label}
                          </Label>
                          <div className="relative">
                            <Input
                              type={field.showPassword ? "text" : "password"}
                              value={field.value}
                              onChange={(e) => field.setValue(e.target.value)}
                              disabled={isChangingPassword}
                              className="border-gray-300 focus:border-[#9b87f5] focus:ring-[#9b87f5]/20 rounded-xl pr-10"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                              onClick={field.toggleVisibility}
                              disabled={isChangingPassword}
                            >
                              {field.showPassword ? (
                                <EyeOff className="h-4 w-4 text-gray-500" />
                              ) : (
                                <Eye className="h-4 w-4 text-gray-500" />
                              )}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-end space-x-3 pt-4">
                      <Button
                        variant="outline"
                        onClick={() => setIsPasswordModalOpen(false)}
                        disabled={isChangingPassword}
                        className="border-gray-300 text-gray-600 hover:bg-gray-50 rounded-xl"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handlePasswordChange}
                        disabled={isChangingPassword}
                        className="bg-[#9b87f5] hover:bg-[#7E69AB] text-white rounded-xl"
                      >
                        {isChangingPassword ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Changing...
                          </>
                        ) : (
                          'Change Password'
                        )}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="bg-white rounded-xl shadow-sm h-full">
              <div className="p-8">
                <div className="flex items-center gap-4 mb-8">
                  <div className="p-3 bg-[#9b87f5] rounded-xl shadow-lg">
                    <TrendingUp className="h-6 w-6 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-[#6E59A5]">
                    Activity Overview
                  </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    {
                      icon: Clock,
                      label: "Pomodoro Sessions",
                      value: userStats.pomodoro_sessions,
                      iconBg: "bg-rose-500",
                    },
                    {
                      icon: Users,
                      label: "Focus Buddy Sessions",
                      value: userStats.focus_buddy_sessions,
                      iconBg: "bg-blue-500",
                    },
                    {
                      icon: Book,
                      label: "Journals Created",
                      value: userStats.journals_created,
                      iconBg: "bg-amber-500",
                    },
                  ].map((stat, index) => {
                    const Icon = stat.icon;
                    return (
                      <div
                        key={index}
                        className="bg-white rounded-xl p-6 border border-gray-200 text-center group hover:shadow-md transition-all duration-200"
                      >
                        <div
                          className={`w-14 h-14 ${stat.iconBg} rounded-xl flex items-center justify-center shadow-lg mx-auto mb-4`}
                        >
                          <Icon className="h-7 w-7 text-white" />
                        </div>
                        <div className="text-3xl font-bold text-gray-900 mb-2">
                          {stat.value}
                        </div>
                        <p className="font-semibold text-gray-800 mb-1">
                          {stat.label}
                        </p>
                        <p className="text-sm text-gray-500">
                          Total completed
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Card>
          </div>

          {/* Daily Streak */}
          <Card className="bg-white rounded-xl shadow-sm">
            <div className="p-8">
              <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-[#9b87f5] rounded-xl shadow-lg">
                  <Calendar className="h-6 w-6 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-[#6E59A5]">
                  Daily Streak
                </h2>
              </div>
              <div className="text-center space-y-6">
                <div className="relative">
                  <div className="w-36 h-36 mx-auto bg-[#F0EBFF] rounded-full flex items-center justify-center shadow-inner border-4 border-[#9b87f5]/20">
                    <div className="text-center">
                      <div className="text-5xl font-bold text-[#6E59A5]">
                        {userStats.daily_streak}
                      </div>
                      <div className="text-sm font-semibold text-gray-600 mt-1">
                        DAYS
                      </div>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <p className="text-lg font-semibold text-gray-800">
                    Keep your momentum going!
                  </p>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Complete any activity daily to maintain your streak
                  </p>
                </div>
                <div className="bg-[#F0EBFF] rounded-xl p-4 border border-gray-200">
                  <p className="text-sm font-semibold text-[#6E59A5] mb-3">
                    Streak Activities:
                  </p>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li>• Create a journal entry</li>
                    <li>• Complete a Pomodoro session</li>
                    <li>• Join Focus Buddy session</li>
                  </ul>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Account Management */}
        <Card className="bg-white rounded-xl shadow-sm">
          <div className="p-8">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-[#9b87f5] rounded-xl shadow-lg">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-[#6E59A5]">
                Account Management
              </h2>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              {/* Delete Account Modal */}
              <Dialog
                open={isDeleteModalOpen}
                onOpenChange={(open) => {
                  setIsDeleteModalOpen(open);
                  if (!open) {
                    // Reset states when modal closes
                    setDeleteConfirmText("");
                  }
                }}
              >
                <DialogTrigger asChild>
                  <Button
                    variant="destructive"
                    className="flex-1 sm:flex-none bg-red-500 hover:bg-red-600 text-white transition-all duration-200 rounded-xl py-3 px-6 shadow-lg"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Account
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px] bg-white rounded-2xl">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-red-600 flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5" />
                      Delete Account
                    </DialogTitle>
                  </DialogHeader>
                  <div className="py-4 space-y-4">
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                      <p className="text-red-800 font-semibold mb-2">
                        ⚠️ Warning: This action cannot be undone!
                      </p>
                      <p className="text-red-700 text-sm">
                        Deleting your account will permanently remove all your data, including:
                      </p>
                      <ul className="text-red-700 text-sm mt-2 space-y-1">
                        <li>• All your journal entries</li>
                        <li>• Pomodoro session history</li>
                        <li>• Focus buddy sessions</li>
                        <li>• Daily streak progress</li>
                        <li>• Account settings and preferences</li>
                      </ul>
                    </div>
                    
                    <div className="space-y-3">
                      <Label className="text-sm font-semibold text-gray-700">
                        To confirm deletion, type "DELETE MY ACCOUNT" below:
                      </Label>
                      <Input
                        value={deleteConfirmText}
                        onChange={(e) => setDeleteConfirmText(e.target.value)}
                        placeholder="DELETE MY ACCOUNT"
                        disabled={isDeletingAccount}
                        className="border-gray-300 focus:border-red-500 focus:ring-red-500/20 rounded-xl"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end space-x-3 pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setIsDeleteModalOpen(false)}
                      disabled={isDeletingAccount}
                      className="border-gray-300 text-gray-600 hover:bg-gray-50 rounded-xl"
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleDeleteAccount}
                      disabled={isDeletingAccount || deleteConfirmText.toLowerCase() !== 'delete my account'}
                      className="bg-red-500 hover:bg-red-600 text-white rounded-xl"
                    >
                      {isDeletingAccount ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Deleting...
                        </>
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Account
                        </>
                      )}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </Card>
      </div>

      <ToastContainer />
    </div>
  );
};

export default Settings;