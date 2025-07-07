import React from 'react';
import { Progress } from "../ui/progress";

export const TimerDisplay = ({
  time,
  currentTask
}) => {
  // Add error handling for invalid time values
  const validTime = typeof time === 'number' && !isNaN(time) ? time : 0;
  
  const minutes = Math.floor(validTime / 60);
  const seconds = validTime % 60;
  const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  // Always use 25 min or currentTask.estimated_pomodoros if needed
  const initialTime = 25 * 60;
  const elapsedPercentage = ((initialTime - validTime) / initialTime) * 100;
  const progressValue = Math.min(Math.max(elapsedPercentage, 0), 100);

  return (
    <div className="text-center space-y-4">
      <div className="inline-flex items-center space-x-2">
        <span className="h-3 w-3 rounded-full bg-green-500" />
        <span className="text-sm font-medium text-gray-600">
          Focus Session
        </span>
      </div>

      <div className="text-6xl font-light text-[#7E69AB] tracking-tight">
        {formattedTime}
      </div>

      <Progress value={progressValue} className="w-full h-2" />
    </div>
  );
};