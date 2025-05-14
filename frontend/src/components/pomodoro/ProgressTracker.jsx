import React from 'react';

export const ProgressTracker = ({ currentSession, totalSessions }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h3 className="text-lg font-semibold text-[#6E59A5] mb-4">Today's Progress</h3>
      <div className="flex justify-between items-center">
        <div className="flex space-x-2">
          {Array.from({ length: totalSessions }).map((_, index) => (
            <div
              key={index}
              className={`h-3 w-3 rounded-full ${
                index < currentSession ? 'bg-[#9b87f5]' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
        <span className="text-sm text-gray-600">
          {currentSession} of {totalSessions} Pomodoros
        </span>
      </div>
    </div>
  );
};
