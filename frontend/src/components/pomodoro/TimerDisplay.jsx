import React from 'react';
import { Progress } from "../ui/progress";

export const TimerDisplay = ({
  time,
  sessionType = 'focus',
  currentSession = 1,
  totalSessions = 4,
  currentTask
}) => {
  // Add error handling for invalid time values
  const validTime = typeof time === 'number' && !isNaN(time) ? time : 0;
  
  const minutes = Math.floor(validTime / 60);
  const seconds = validTime % 60;
  const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  // Calculate progress based on session type
  // This would ideally come from the hook, but here's a simple version
  // Assumption: The default session lengths are 25min focus, 5min short break, 15min long break
  const getInitialTime = () => {
    switch(sessionType) {
      case 'focus': return 25 * 60;
      case 'shortBreak': return 5 * 60;
      case 'longBreak': return 15 * 60;
      default: return 25 * 60;
    }
  };
  
  const initialTime = getInitialTime();
  const elapsedPercentage = ((initialTime - validTime) / initialTime) * 100;
  const progressValue = Math.min(Math.max(elapsedPercentage, 0), 100);

  return (
    <div className="text-center space-y-4">
      <div className="inline-flex items-center space-x-2">
        <span className={`h-3 w-3 rounded-full ${
          sessionType === 'focus' ? 'bg-green-500' : 'bg-blue-500'
        }`} />
        <span className="text-sm font-medium text-gray-600">
          Session {currentSession} of {currentTask.estimated_pomodoros}
        </span>
      </div>

      <div className="text-6xl font-light text-[#7E69AB] tracking-tight">
        {formattedTime}
      </div>

      <Progress value={progressValue} className="w-full h-2" />
    </div>
  );
};