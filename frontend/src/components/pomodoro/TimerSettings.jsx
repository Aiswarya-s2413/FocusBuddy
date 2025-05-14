import React, { useState } from 'react';
import { Label } from "../ui/label";
import { Slider } from "../ui/slider";
import { Switch } from "../ui/switch";
import { Button } from "../ui/button";
import { useToast } from "../ui/use-toast";

export function TimerSettings({ onSaveSettings, defaultSettings }) {
  const { toast } = useToast();
  const [focusDuration, setFocusDuration] = useState(defaultSettings.focusDuration);
  const [shortBreakDuration, setShortBreakDuration] = useState(defaultSettings.shortBreakDuration);
  const [longBreakDuration, setLongBreakDuration] = useState(defaultSettings.longBreakDuration);
  const [sessionsBeforeLongBreak, setSessionsBeforeLongBreak] = useState(defaultSettings.sessionsBeforeLongBreak);
  const [autoStartNextSession, setAutoStartNextSession] = useState(defaultSettings.autoStartNextSession);
  const [playSoundWhenSessionEnds, setPlaySoundWhenSessionEnds] = useState(defaultSettings.playSoundWhenSessionEnds);

  const handleSaveSettings = () => {
    onSaveSettings({
      focusDuration,
      shortBreakDuration,
      longBreakDuration,
      sessionsBeforeLongBreak,
      autoStartNextSession,
      playSoundWhenSessionEnds
    });

    toast({
      title: "Settings saved",
      description: "Your timer settings have been updated.",
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 space-y-6">
      <h3 className="text-lg font-semibold text-[#6E59A5]">Timer Settings</h3>
      
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Focus Duration (minutes)</Label>
            <span className="text-sm font-medium text-gray-600">{focusDuration}</span>
          </div>
          <Slider 
            value={[focusDuration]} 
            max={60} 
            step={1}
            onValueChange={(value) => setFocusDuration(value[0])}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Short Break Duration (minutes)</Label>
            <span className="text-sm font-medium text-gray-600">{shortBreakDuration}</span>
          </div>
          <Slider 
            value={[shortBreakDuration]} 
            max={15} 
            step={1}
            onValueChange={(value) => setShortBreakDuration(value[0])}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Long Break Duration (minutes)</Label>
            <span className="text-sm font-medium text-gray-600">{longBreakDuration}</span>
          </div>
          <Slider 
            value={[longBreakDuration]} 
            max={30} 
            step={1}
            onValueChange={(value) => setLongBreakDuration(value[0])}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Sessions before Long Break</Label>
            <span className="text-sm font-medium text-gray-600">{sessionsBeforeLongBreak}</span>
          </div>
          <Slider 
            value={[sessionsBeforeLongBreak]} 
            max={6} 
            min={1}
            step={1}
            onValueChange={(value) => setSessionsBeforeLongBreak(value[0])}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label>Auto-start next session</Label>
          <Switch 
            checked={autoStartNextSession}
            onCheckedChange={setAutoStartNextSession}
          />
        </div>

        <div className="flex items-center justify-between">
          <Label>Play sound when session ends</Label>
          <Switch 
            checked={playSoundWhenSessionEnds}
            onCheckedChange={setPlaySoundWhenSessionEnds}
          />
        </div>

        <Button 
          className="w-full bg-[#9b87f5] hover:bg-[#7E69AB]"
          onClick={handleSaveSettings}
        >
          Save Settings
        </Button>
      </div>
    </div>
  );
}
