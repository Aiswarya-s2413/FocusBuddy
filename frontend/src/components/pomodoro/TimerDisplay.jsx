import React from 'react';
import { Progress } from "../ui/progress";

export const TimerDisplay = ({
  time,
  sessionType,
  currentSession,
  totalSessions
}) => {
  const minutes = Math.floor(time / 60);
  const seconds = time % 60;
  const formattedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  return (
    <div className="text-center space-y-4">
      <div className="inline-flex items-center space-x-2">
        <span className={`h-3 w-3 rounded-full ${
          sessionType === 'focus' ? 'bg-green-500' : 'bg-blue-500'
        }`} />
        <span className="text-sm font-medium text-gray-600">
          Session {currentSession} of {totalSessions}
        </span>
      </div>

      <div className="text-6xl font-light text-[#7E69AB] tracking-tight">
        {formattedTime}
      </div>

      <Progress value={75} className="w-full h-2" />
    </div>
  );
};
