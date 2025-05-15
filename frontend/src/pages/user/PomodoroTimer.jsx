import React, { useState, useEffect, useRef } from 'react';
import { TimerDisplay } from '../../components/pomodoro/TimerDisplay';
import { TimerControls } from '../../components/pomodoro/TimerControls';
import { ProgressTracker } from '../../components/pomodoro/ProgressTracker';
import { MotivationalWidget } from '../../components/pomodoro/MotivationalWidget';
import { TaskForm } from '../../components/pomodoro/TaskForm';

// Convert to a React component that returns JSX
const PomodoroTimer = ({ onCompletePomodoro, onCompleteSession }) => {
  // Default settings
  const defaultSettings = {
    focusDuration: 25,
    shortBreakDuration: 5,
    longBreakDuration: 15,
    sessionsBeforeLongBreak: 4,
    autoStartNextSession: false,
    playSoundWhenSessionEnds: true
  };

  // State
  const [settings, setSettings] = useState(defaultSettings);
  const [time, setTime] = useState(defaultSettings.focusDuration * 60); // Initialize with focus duration in seconds
  const [isRunning, setIsRunning] = useState(false);
  const [sessionType, setSessionType] = useState('focus');
  const [currentSession, setCurrentSession] = useState(1);
  const [currentTask, setCurrentTask] = useState(null);
  const [timerVisible, setTimerVisible] = useState(false);
  
  // References
  const timerRef = useRef(null);
  const totalTimeRef = useRef(0);
  
  // Constants
  const totalSessions = settings.sessionsBeforeLongBreak;

  // Effect to calculate initial time based on session type
  useEffect(() => {
    // Reset the timer whenever session type changes
    let initialTime;
    
    switch (sessionType) {
      case 'focus':
        initialTime = settings.focusDuration * 60;
        break;
      case 'shortBreak':
        initialTime = settings.shortBreakDuration * 60;
        break;
      case 'longBreak':
        initialTime = settings.longBreakDuration * 60;
        break;
      default:
        initialTime = settings.focusDuration * 60;
    }
    
    // Store total time for progress calculation
    totalTimeRef.current = initialTime;
    
    // Reset timer
    setTime(initialTime);
    setIsRunning(false);
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [sessionType, settings]);

  // Timer logic
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTime(prevTime => {
          if (prevTime <= 1) {
            // Timer completed
            clearInterval(timerRef.current);
            handleTimerComplete();
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    // Cleanup
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRunning]);

  // Handler for timer completion
  const handleTimerComplete = () => {
    // Handle different session types
    if (sessionType === 'focus') {
      // Increment completed pomodoros for current task
      if (currentTask && currentTask.id) {
        onCompletePomodoro && onCompletePomodoro(currentTask.id);
      }
      
      // Determine next break type
      if (currentSession >= totalSessions) {
        setSessionType('longBreak');
      } else {
        setSessionType('shortBreak');
      }
    } else {
      // After break, go back to focus
      setSessionType('focus');
      
      // If it was a long break, reset session counter
      if (sessionType === 'longBreak') {
        setCurrentSession(1);
      } else {
        setCurrentSession(prev => prev + 1);
      }
    }
    
    // Auto-start next session if enabled
    if (settings.autoStartNextSession) {
      setIsRunning(true);
    }
    
    // Play sound if enabled
    if (settings.playSoundWhenSessionEnds) {
      // Play sound logic would go here
    }
    
    // Record session completion
    onCompleteSession && onCompleteSession();
  };

  // Timer controls
  const startTimer = () => setIsRunning(true);
  const pauseTimer = () => setIsRunning(false);
  
  const resetTimer = () => {
    pauseTimer();
    
    // Reset to current session type's duration
    let resetTime;
    switch (sessionType) {
      case 'focus':
        resetTime = settings.focusDuration * 60;
        break;
      case 'shortBreak':
        resetTime = settings.shortBreakDuration * 60;
        break;
      case 'longBreak':
        resetTime = settings.longBreakDuration * 60;
        break;
      default:
        resetTime = settings.focusDuration * 60;
    }
    
    setTime(resetTime);
    totalTimeRef.current = resetTime;
  };

  // Settings updater
  const updateSettings = (newSettings) => {
    setSettings(prev => ({
      ...prev,
      ...newSettings
    }));
    
    // Apply settings immediately by resetting timer
    resetTimer();
  };

  // Set task for the timer
  const setTaskForTimer = (task) => {
    setCurrentTask(task);
    resetTimer();
  };

  // Handle task submission
  const handleTaskSubmit = (newTask) => {
    // Create a task with an ID (in a real app, this would come from the server)
    const taskWithId = {
      ...newTask,
      id: Date.now().toString(), // Simple temporary ID
      completed_pomodoros: 0,
      estimated_pomodoros: Math.ceil(newTask.estimated_minutes / settings.focusDuration)
    };
    
    // Set this task as the current task for the timer
    setTaskForTimer(taskWithId);
    
    // Show the timer component
    setTimerVisible(true);
    
    // In a real application, you might also save this task to state or send it to a server
    // For example: addTaskToList(taskWithId);
  };

  return (
    <div className="space-y-8">
      {/* Task Form Component - Always visible */}
      <TaskForm onTaskSubmit={handleTaskSubmit} />
      
      {/* Timer UI - Only visible after task submission */}
      {timerVisible && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          {/* Display current task if available */}
          {currentTask && (
            <div className="mb-6 p-4 bg-[#F8F6FB] rounded-lg">
              <h3 className="font-semibold text-[#6E59A5]">Current Task: {currentTask.title}</h3>
              {currentTask.description && (
                <p className="text-sm text-gray-600 mt-2">{currentTask.description}</p>
              )}
              <div className="flex justify-between mt-2 text-sm text-gray-500">
                <span>Estimated: {currentTask.estimated_minutes} minutes</span>
                <span>Completed Pomodoros: {currentTask.completed_pomodoros}</span>
              </div>
            </div>
          )}
        
          <TimerDisplay 
            time={time} 
            sessionType={sessionType} 
            currentSession={currentSession} 
            totalSessions={totalSessions} 
          />
          
          <TimerControls 
            isRunning={isRunning}
            onStart={startTimer}
            onPause={pauseTimer}
            onReset={resetTimer}
            sessionType={sessionType}
            onSessionTypeChange={setSessionType}
          />
          
          <div className="mt-8 space-y-6">
            <ProgressTracker 
              currentSession={currentSession} 
              totalSessions={totalSessions} 
            />
            
            <MotivationalWidget />
          </div>
        </div>
      )}
    </div>
  );
};

// Also create a hook version for reusing timer logic elsewhere
export const usePomodoro = (onCompletePomodoro, onCompleteSession) => {
  // Default settings
  const defaultSettings = {
    focusDuration: 25,
    shortBreakDuration: 5,
    longBreakDuration: 15,
    sessionsBeforeLongBreak: 4,
    autoStartNextSession: false,
    playSoundWhenSessionEnds: true
  };

  // State
  const [settings, setSettings] = useState(defaultSettings);
  const [time, setTime] = useState(defaultSettings.focusDuration * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionType, setSessionType] = useState('focus');
  const [currentSession, setCurrentSession] = useState(1);
  const [currentTask, setCurrentTask] = useState(null);
  
  // References
  const timerRef = useRef(null);
  const totalTimeRef = useRef(0);
  
  // Constants
  const totalSessions = settings.sessionsBeforeLongBreak;

  // Effect to calculate initial time based on session type
  useEffect(() => {
    // Reset the timer whenever session type changes
    let initialTime;
    
    switch (sessionType) {
      case 'focus':
        initialTime = settings.focusDuration * 60;
        break;
      case 'shortBreak':
        initialTime = settings.shortBreakDuration * 60;
        break;
      case 'longBreak':
        initialTime = settings.longBreakDuration * 60;
        break;
      default:
        initialTime = settings.focusDuration * 60;
    }
    
    // Store total time for progress calculation
    totalTimeRef.current = initialTime;
    
    // Reset timer
    setTime(initialTime);
    setIsRunning(false);
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [sessionType, settings]);

  // Timer logic
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTime(prevTime => {
          if (prevTime <= 1) {
            // Timer completed
            clearInterval(timerRef.current);
            handleTimerComplete();
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    // Cleanup
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRunning]);

  // Handler for timer completion
  const handleTimerComplete = () => {
    // Handle different session types
    if (sessionType === 'focus') {
      // Increment completed pomodoros for current task
      if (currentTask && currentTask.id) {
        onCompletePomodoro && onCompletePomodoro(currentTask.id);
      }
      
      // Determine next break type
      if (currentSession >= totalSessions) {
        setSessionType('longBreak');
      } else {
        setSessionType('shortBreak');
      }
    } else {
      // After break, go back to focus
      setSessionType('focus');
      
      // If it was a long break, reset session counter
      if (sessionType === 'longBreak') {
        setCurrentSession(1);
      } else {
        setCurrentSession(prev => prev + 1);
      }
    }
    
    // Auto-start next session if enabled
    if (settings.autoStartNextSession) {
      setIsRunning(true);
    }
    
    // Play sound if enabled
    if (settings.playSoundWhenSessionEnds) {
      // Play sound logic would go here
    }
    
    // Record session completion
    onCompleteSession && onCompleteSession();
  };

  // Timer controls
  const startTimer = () => setIsRunning(true);
  const pauseTimer = () => setIsRunning(false);
  
  const resetTimer = () => {
    pauseTimer();
    
    // Reset to current session type's duration
    let resetTime;
    switch (sessionType) {
      case 'focus':
        resetTime = settings.focusDuration * 60;
        break;
      case 'shortBreak':
        resetTime = settings.shortBreakDuration * 60;
        break;
      case 'longBreak':
        resetTime = settings.longBreakDuration * 60;
        break;
      default:
        resetTime = settings.focusDuration * 60;
    }
    
    setTime(resetTime);
    totalTimeRef.current = resetTime;
  };

  // Settings updater
  const updateSettings = (newSettings) => {
    setSettings(prev => ({
      ...prev,
      ...newSettings
    }));
    
    // Apply settings immediately by resetting timer
    resetTimer();
  };

  // Set task for the timer
  const setTaskForTimer = (task) => {
    setCurrentTask(task);
    resetTimer();
  };

  return {
    time,
    isRunning,
    sessionType,
    currentSession,
    totalSessions,
    settings,
    currentTask,
    startTimer,
    pauseTimer,
    resetTimer,
    setSessionType,
    updateSettings,
    setTaskForTimer
  };
};

export default PomodoroTimer;