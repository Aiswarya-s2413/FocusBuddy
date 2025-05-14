import React from 'react';
import { Button } from "../ui/button";
import { Play, Pause, RotateCcw } from "lucide-react";

export const TimerControls = ({
  isRunning,
  onStart,
  onPause,
  onReset,
  sessionType,
  onSessionTypeChange,
}) => {
  return (
    <div className="space-y-6 mt-8">
      <div className="flex justify-center space-x-2">
        <Button
          variant="outline"
          className={`${sessionType === 'focus' ? 'bg-[#F8F6FB] border-[#9b87f5] text-[#9b87f5]' : 'border-gray-200'}`}
          onClick={() => onSessionTypeChange('focus')}
        >
          Focus
        </Button>
        <Button
          variant="outline"
          className={`${sessionType === 'shortBreak' ? 'bg-[#F8F6FB] border-[#9b87f5] text-[#9b87f5]' : 'border-gray-200'}`}
          onClick={() => onSessionTypeChange('shortBreak')}
        >
          Short Break
        </Button>
        <Button
          variant="outline"
          className={`${sessionType === 'longBreak' ? 'bg-[#F8F6FB] border-[#9b87f5] text-[#9b87f5]' : 'border-gray-200'}`}
          onClick={() => onSessionTypeChange('longBreak')}
        >
          Long Break
        </Button>
      </div>

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
          onClick={onReset}
        >
          <RotateCcw className="mr-2 h-4 w-4" />
          Reset
        </Button>
      </div>
    </div>
  );
};
