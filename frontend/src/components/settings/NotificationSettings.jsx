import React from "react";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";
import { Bell } from "lucide-react";

const NotificationSettings = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Bell className="h-5 w-5" />
        <h2 className="text-xl font-semibold">Notification Settings</h2>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Daily Focus Reminder</Label>
            <p className="text-sm text-muted-foreground">
              Receive daily reminders to start your focus sessions
            </p>
          </div>
          <Switch />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Pomodoro Sound Alerts</Label>
            <p className="text-sm text-muted-foreground">Play sound when timer ends</p>
          </div>
          <Switch />
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Vibration</Label>
            <p className="text-sm text-muted-foreground">Vibrate device on timer completion</p>
          </div>
          <Switch />
        </div>
      </div>
    </div>
  );
};

export default NotificationSettings;
