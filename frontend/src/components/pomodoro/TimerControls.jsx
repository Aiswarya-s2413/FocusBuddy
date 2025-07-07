import React from 'react';
import { Button } from "../ui/button";
import { Play, Pause, RotateCcw, Square } from "lucide-react";
import { userAxios } from '../../utils/axios'; 

export const TimerControls = ({
  isRunning,
  onStart,
  onPause,
  onReset,
  onStop,
  currentSessionId,
}) => {
  const handleStop = async () => {
    try {
      if (currentSessionId) {
        // Call the backend API to complete the session
        await userAxios.post(`sessions/${currentSessionId}/complete/`);
        console.log('Session completed successfully');
      }
      
      // Call the parent component's onStop function
      if (onStop) {
        onStop();
      }
    } catch (error) {
      console.error('Error completing session:', error);
      // Still call onStop even if API call fails
      if (onStop) {
        onStop();
      }
    }
  };

  return (
    <div className="space-y-6 mt-8">
      <div className="flex justify-center space-x-4">
        <Button
          variant="outline"
          className="border-[#9b87f5] text-[#9b87f5] hover:bg-[#F8F6FB]"
          onClick={isRunning ? onPause : onStart}
        >
          {isRunning ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
          {isRunning ? 'Pause' : 'Start'}
        </Button>
        
        <Button
          variant="outline"
          className="border-[#9b87f5] text-[#9b87f5] hover:bg-[#F8F6FB]"
          onClick={handleStop}
          disabled={!isRunning} // Only enable when timer is running
        >
          <Square className="mr-2 h-4 w-4" />
          Stop
        </Button>
        
        <Button
          variant="outline"
          className="border-[#9b87f5] text-[#9b87f5] hover:bg-[#F8F6FB]"
          onClick={onReset}
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          Reset
        </Button>
      </div>
    </div>
  );
};