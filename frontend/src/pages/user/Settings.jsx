import React, { useEffect } from "react";
import { Card } from "../../components/ui/card";
import ProfileSection from "../../components/settings/ProfileSection";
import NotificationSettings from "../../components/settings/NotificationSettings";
import PrivacySettings from "../../components/settings/PrivacySettings";
import AccountManagement from "../../components/settings/AccountManagement";
import { useNavigate } from "react-router-dom";

const Settings = () => {
  const navigate = useNavigate();
  useEffect(() => {
    if (!localStorage.getItem("user")) {
      navigate("/login", { replace: true });
    }
    const handlePopState = () => {
      if (!localStorage.getItem("user")) {
        navigate("/login", { replace: true });
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [navigate]);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Settings</h1>
      <div className="space-y-8 max-w-2xl mx-auto">
        <Card className="p-6">
          <ProfileSection />
        </Card>
        
        <Card className="p-6">
          <NotificationSettings />
        </Card>
        
        <Card className="p-6">
          <PrivacySettings />
        </Card> 
        
        <Card className="p-6">
          <AccountManagement />
        </Card>
      </div>
    </div>
  );
};

export default Settings;