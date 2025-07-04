import React, { useState } from "react";
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
  Settings as SettingsIcon, // ✅ Renamed here
} from "lucide-react";

const Settings = () => {
  const { toast, ToastContainer } = useSimpleToast();
  const [userName, setUserName] = useState("Alex Johnson");
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(userName);

  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const userStats = {
    pomodoroSessions: 187,
    focusBuddySessions: 23,
    journalsCreated: 45,
    dailyStreak: 12,
  };

  const handleNameSave = () => {
    if (tempName.trim()) {
      setUserName(tempName.trim());
      setIsEditingName(false);
      toast.success("Name updated successfully!");
    }
  };

  const handlePasswordChange = () => {
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

    setIsPasswordModalOpen(false);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");

    toast.success("Password changed successfully!");
  };

  const handleLogout = () => {
    toast.success("Logged out successfully!");
  };

  const handleDeleteAccount = () => {
    toast.success("Account deleted successfully!");
  };

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
                      className="flex-1 bg-white border-gray-300 focus:border-[#9b87f5] focus:ring-2 focus:ring-[#9b87f5]/20 rounded-xl"
                    />
                    <Button
                      size="sm"
                      onClick={handleNameSave}
                      className="bg-[#9b87f5] hover:bg-[#7E69AB] text-white px-6 rounded-xl shadow-lg"
                    >
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setIsEditingName(false);
                        setTempName(userName);
                      }}
                      className="border-gray-300 text-gray-600 hover:bg-gray-50 rounded-xl"
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <p className="text-xl font-semibold text-gray-900">
                      {userName}
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

              {/* Password Change Button */}
              <div>
                <Dialog
                  open={isPasswordModalOpen}
                  onOpenChange={setIsPasswordModalOpen}
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
                        },
                        {
                          label: "New Password",
                          value: newPassword,
                          setValue: setNewPassword,
                        },
                        {
                          label: "Confirm New Password",
                          value: confirmPassword,
                          setValue: setConfirmPassword,
                        },
                      ].map((field, idx) => (
                        <div key={idx} className="space-y-2">
                          <Label className="text-sm font-semibold text-gray-700">
                            {field.label}
                          </Label>
                          <Input
                            type="password"
                            value={field.value}
                            onChange={(e) => field.setValue(e.target.value)}
                            className="border-gray-300 focus:border-[#9b87f5] focus:ring-[#9b87f5]/20 rounded-xl"
                          />
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-end space-x-3 pt-4">
                      <Button
                        variant="outline"
                        onClick={() => setIsPasswordModalOpen(false)}
                        className="border-gray-300 text-gray-600 hover:bg-gray-50 rounded-xl"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handlePasswordChange}
                        className="bg-[#9b87f5] hover:bg-[#7E69AB] text-white rounded-xl"
                      >
                        Change Password
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
                      value: userStats.pomodoroSessions,
                      iconBg: "bg-rose-500",
                    },
                    {
                      icon: Users,
                      label: "Focus Buddy Sessions",
                      value: userStats.focusBuddySessions,
                      iconBg: "bg-blue-500",
                    },
                    {
                      icon: Book,
                      label: "Journals Created",
                      value: userStats.journalsCreated,
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
                        {userStats.dailyStreak}
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
              <Button
                variant="outline"
                className="flex-1 sm:flex-none border-gray-300 text-gray-700 hover:bg-[#F0EBFF] hover:border-[#9b87f5] transition-all duration-200 rounded-xl py-3 px-6"
                onClick={handleLogout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>

              <Button
                variant="destructive"
                className="flex-1 sm:flex-none bg-red-500 hover:bg-red-600 text-white transition-all duration-200 rounded-xl py-3 px-6 shadow-lg"
                onClick={handleDeleteAccount}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Account
              </Button>
            </div>
          </div>
        </Card>
      </div>

      <ToastContainer />
    </div>
  );
};

export default Settings;
