import React, { useState, useEffect, useRef } from 'react';
import { TimerDisplay } from '../../components/pomodoro/TimerDisplay';
import { TimerControls } from '../../components/pomodoro/TimerControls';
import { ProgressTracker } from '../../components/pomodoro/ProgressTracker';
import { MotivationalWidget } from '../../components/pomodoro/MotivationalWidget';
import { TaskForm } from '../../components/pomodoro/TaskForm';
import { userAxios } from '../../utils/axios';

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
  const [settings, setSettings] = useState(() => {
    // Try to get settings from localStorage
    const savedSettings = localStorage.getItem('pomodoroSettings');
    return savedSettings ? JSON.parse(savedSettings) : defaultSettings;
  });
  
  const [time, setTime] = useState(() => {
    // Try to get time from localStorage
    const savedTime = localStorage.getItem('pomodoroTime');
    return savedTime ? parseInt(savedTime, 10) : defaultSettings.focusDuration * 60;
  });
  
  const [isRunning, setIsRunning] = useState(() => {
    // Try to get running state from localStorage
    const savedIsRunning = localStorage.getItem('pomodoroIsRunning');
    return savedIsRunning === 'true';
  });
  
  const [sessionType, setSessionType] = useState(() => {
    // Try to get session type from localStorage
    const savedSessionType = localStorage.getItem('pomodoroSessionType');
    return savedSessionType || 'focus';
  });
  
  const [currentSession, setCurrentSession] = useState(() => {
    // Try to get current session from localStorage
    const savedCurrentSession = localStorage.getItem('pomodoroCurrentSession');
    return savedCurrentSession ? parseInt(savedCurrentSession, 10) : 1;
  });
  
  const [currentTask, setCurrentTask] = useState(() => {
    // Try to get current task from localStorage
    const savedCurrentTask = localStorage.getItem('pomodoroCurrentTask');
    return savedCurrentTask ? JSON.parse(savedCurrentTask) : null;
  });
  
  const [timerVisible, setTimerVisible] = useState(() => {
    // Try to get timer visibility from localStorage
    const savedTimerVisible = localStorage.getItem('pomodoroTimerVisible');
    return savedTimerVisible === 'true';
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tasks, setTasks] = useState([]);
  
  // References
  const timerRef = useRef(null);
  const totalTimeRef = useRef(() => {
    // Try to get total time from localStorage
    const savedTotalTime = localStorage.getItem('pomodoroTotalTime');
    return savedTotalTime ? parseInt(savedTotalTime, 10) : defaultSettings.focusDuration * 60;
  });
  
  // Store last updated timestamp to calculate elapsed time during page refresh
  const lastUpdatedRef = useRef(() => {
    const savedLastUpdated = localStorage.getItem('pomodoroLastUpdated');
    return savedLastUpdated ? parseInt(savedLastUpdated, 10) : Date.now();
  });
  
  // Constants
  const totalSessions = settings.sessionsBeforeLongBreak;

  // Store state in localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('pomodoroSettings', JSON.stringify(settings));
  }, [settings]);
  
  useEffect(() => {
    localStorage.setItem('pomodoroTime', time.toString());
  }, [time]);
  
  useEffect(() => {
    localStorage.setItem('pomodoroIsRunning', isRunning.toString());
  }, [isRunning]);
  
  useEffect(() => {
    localStorage.setItem('pomodoroSessionType', sessionType);
  }, [sessionType]);
  
  useEffect(() => {
    localStorage.setItem('pomodoroCurrentSession', currentSession.toString());
  }, [currentSession]);
  
  useEffect(() => {
    if (currentTask) {
      localStorage.setItem('pomodoroCurrentTask', JSON.stringify(currentTask));
    } else {
      localStorage.removeItem('pomodoroCurrentTask');
    }
  }, [currentTask]);
  
  useEffect(() => {
    localStorage.setItem('pomodoroTimerVisible', timerVisible.toString());
  }, [timerVisible]);
  
  useEffect(() => {
    if (totalTimeRef.current) {
      localStorage.setItem('pomodoroTotalTime', totalTimeRef.current.toString());
    }
  }, [totalTimeRef.current]);

  // Effect to handle time updates during page refresh
  useEffect(() => {
    // If timer was running when page was refreshed, adjust the time
    if (isRunning) {
      const lastUpdated = parseInt(localStorage.getItem('pomodoroLastUpdated') || Date.now(), 10);
      const now = Date.now();
      const elapsedSeconds = Math.floor((now - lastUpdated) / 1000);
      
      // Update time if page was refreshed while timer was running
      if (elapsedSeconds > 0) {
        const newTime = Math.max(0, time - elapsedSeconds);
        setTime(newTime);
        
        // If timer would have completed during refresh, handle completion
        if (newTime === 0) {
          handleTimerComplete();
        }
      }
    }
    
    // Start updating lastUpdated timestamp periodically
    const intervalId = setInterval(() => {
      localStorage.setItem('pomodoroLastUpdated', Date.now().toString());
    }, 1000);
    
    return () => clearInterval(intervalId);
  }, []);

  // Fetch tasks when component mounts
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setIsLoading(true);
        const response = await userAxios.get('/tasks/');
        setTasks(response.data);
      } catch (error) {
        console.error('Error fetching tasks:', error);
        setError('Failed to load tasks');
      } finally {
        setIsLoading(false);
      }
    };

    fetchTasks();
  }, []);

  // FIXED: Effect to handle session type changes (separate from pause/resume)
  useEffect(() => {
    // Reset the timer when session type changes (not when pausing/resuming)
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
    localStorage.setItem('pomodoroTotalTime', initialTime.toString());
    
    // Reset timer when session type changes
    setTime(initialTime);
    
    // Always pause when session type changes
    setIsRunning(false);
    
  }, [sessionType, settings]); // Only depend on sessionType and settings

  // Separate effect for cleanup
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Timer logic
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTime(prevTime => {
          const newTime = prevTime <= 1 ? 0 : prevTime - 1;
          
          // Update timestamp in localStorage
          localStorage.setItem('pomodoroLastUpdated', Date.now().toString());
          
          if (newTime === 0) {
            // Timer completed
            clearInterval(timerRef.current);
            handleTimerComplete();
          }
          
          return newTime;
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
  const handleTimerComplete = async () => {
    // Handle different session types
    if (sessionType === 'focus') {
      // Increment completed pomodoros for current task
      if (currentTask && currentTask.id) {
        try {
          // Update the task in the database
          const updatedTask = {
            ...currentTask,
            completed_pomodoros: currentTask.completed_pomodoros + 1
          };
          
          await userAxios.patch(`/tasks/${currentTask.id}/`, {
            completed_pomodoros: updatedTask.completed_pomodoros
          });
          
          // Update the task in local state
          setCurrentTask(updatedTask);
          
          // Call the callback if provided
          onCompletePomodoro && onCompletePomodoro(currentTask.id);
        } catch (error) {
          console.error('Error updating task pomodoros:', error);
        }
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
  
  // FIXED: Update resetTimer function to properly handle reset
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
    localStorage.setItem('pomodoroTotalTime', resetTime.toString());
    localStorage.setItem('pomodoroTime', resetTime.toString());
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
    setTimerVisible(true);
    resetTimer();
  };

  // Handle task submission
  const handleTaskSubmit = async (task) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Prepare task data for API
      const taskData = {
        title: task.title,
        description: task.description || '',
        estimated_minutes: task.estimated_minutes,
      };
      
      // Create new task - make sure we're sending the right format
      const response = await userAxios.post('/tasks/', taskData);
      
      // Use the data returned from the server (which includes all fields)
      const newTask = response.data;
      
      // Update state with the task from server (which will have the correct ID and other fields)
      setTaskForTimer(newTask);
      setTasks(prevTasks => [...prevTasks, newTask]);
      
    } catch (error) {
      console.error('Error creating task:', error);
      
      // Log more specific error details from the response
      if (error.response && error.response.data) {
        console.error('Error details:', error.response.data);
      }
      
      setError('Failed to create task. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Reset the timer and return to the task form
  const handleResetAndNewTask = () => {
    pauseTimer();
    setCurrentTask(null);
    setTimerVisible(false);
  };

  const stopTimer = () => {
    setIsRunning(false);
    resetTimer();
  };

  return (
    <div className="space-y-8">
      {/* Error message if there's an error */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      
      {/* Task Form Component - Only visible when no timer is active */}
      {!timerVisible && (
        <TaskForm onTaskSubmit={handleTaskSubmit} isLoading={isLoading} />
      )}
      
      {/* Timer UI - Only visible after task submission */}
      {timerVisible && currentTask && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          {/* Display current task if available */}
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
        
          <TimerDisplay 
            time={time} 
            sessionType={sessionType} 
            currentSession={currentSession} 
            totalSessions={totalSessions} 
            currentTask={currentTask}
          />
          
          <TimerControls 
              isRunning={isRunning}
              onStart={startTimer}
              onPause={pauseTimer}
              onReset={resetTimer}
              onStop={stopTimer}  
              sessionType={sessionType}
              onSessionTypeChange={setSessionType}
              currentSessionId={null} 
            />
          
          <div className="mt-8 space-y-6">
            <ProgressTracker 
              currentSession={currentSession} 
              totalSessions={totalSessions} 
            />
            
            <MotivationalWidget />
          </div>
          
          {/* Button to go back to task form */}
          <button
            onClick={handleResetAndNewTask}
            className="mt-6 w-full py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors"
            type="button"
          >
            Create New Task
          </button>
        </div>
      )}
    </div>
  );
};

// FIXED: Also create a hook version for reusing timer logic elsewhere
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

  // State with localStorage persistence
  const [settings, setSettings] = useState(() => {
    const savedSettings = localStorage.getItem('pomodoroSettings');
    return savedSettings ? JSON.parse(savedSettings) : defaultSettings;
  });
  
  const [time, setTime] = useState(() => {
    const savedTime = localStorage.getItem('pomodoroTime');
    return savedTime ? parseInt(savedTime, 10) : defaultSettings.focusDuration * 60;
  });
  
  const [isRunning, setIsRunning] = useState(() => {
    const savedIsRunning = localStorage.getItem('pomodoroIsRunning');
    return savedIsRunning === 'true';
  });
  
  const [sessionType, setSessionType] = useState(() => {
    const savedSessionType = localStorage.getItem('pomodoroSessionType');
    return savedSessionType || 'focus';
  });
  
  const [currentSession, setCurrentSession] = useState(() => {
    const savedCurrentSession = localStorage.getItem('pomodoroCurrentSession');
    return savedCurrentSession ? parseInt(savedCurrentSession, 10) : 1;
  });
  
  const [currentTask, setCurrentTask] = useState(() => {
    const savedCurrentTask = localStorage.getItem('pomodoroCurrentTask');
    return savedCurrentTask ? JSON.parse(savedCurrentTask) : null;
  });
  
  // References
  const timerRef = useRef(null);
  const totalTimeRef = useRef(() => {
    const savedTotalTime = localStorage.getItem('pomodoroTotalTime');
    return savedTotalTime ? parseInt(savedTotalTime, 10) : defaultSettings.focusDuration * 60;
  });
  
  // Store last updated timestamp
  const lastUpdatedRef = useRef(() => {
    const savedLastUpdated = localStorage.getItem('pomodoroLastUpdated');
    return savedLastUpdated ? parseInt(savedLastUpdated, 10) : Date.now();
  });
  
  // Constants
  const totalSessions = settings.sessionsBeforeLongBreak;
  
  // Store state in localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('pomodoroSettings', JSON.stringify(settings));
  }, [settings]);
  
  useEffect(() => {
    localStorage.setItem('pomodoroTime', time.toString());
  }, [time]);
  
  useEffect(() => {
    localStorage.setItem('pomodoroIsRunning', isRunning.toString());
  }, [isRunning]);
  
  useEffect(() => {
    localStorage.setItem('pomodoroSessionType', sessionType);
  }, [sessionType]);
  
  useEffect(() => {
    localStorage.setItem('pomodoroCurrentSession', currentSession.toString());
  }, [currentSession]);
  
  useEffect(() => {
    if (currentTask) {
      localStorage.setItem('pomodoroCurrentTask', JSON.stringify(currentTask));
    } else {
      localStorage.removeItem('pomodoroCurrentTask');
    }
  }, [currentTask]);

  // Effect to handle time updates during page refresh
  useEffect(() => {
    // If timer was running when page was refreshed, adjust the time
    if (isRunning) {
      const lastUpdated = parseInt(localStorage.getItem('pomodoroLastUpdated') || Date.now(), 10);
      const now = Date.now();
      const elapsedSeconds = Math.floor((now - lastUpdated) / 1000);
      
      // Update time if page was refreshed while timer was running
      if (elapsedSeconds > 0) {
        const newTime = Math.max(0, time - elapsedSeconds);
        setTime(newTime);
        
        // If timer would have completed during refresh, handle completion
        if (newTime === 0) {
          handleTimerComplete();
        }
      }
    }
    
    // Start updating lastUpdated timestamp periodically
    const intervalId = setInterval(() => {
      localStorage.setItem('pomodoroLastUpdated', Date.now().toString());
    }, 1000);
    
    return () => clearInterval(intervalId);
  }, []);

  // FIXED: Effect to handle session type changes (separate from pause/resume)
  useEffect(() => {
    // Reset the timer when session type changes (not when pausing/resuming)
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
    localStorage.setItem('pomodoroTotalTime', initialTime.toString());
    
    // Reset timer when session type changes
    setTime(initialTime);
    
    // Always pause when session type changes
    setIsRunning(false);
    
  }, [sessionType, settings]); // Only depend on sessionType and settings

  // Separate effect for cleanup
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Timer logic
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTime(prevTime => {
          const newTime = prevTime <= 1 ? 0 : prevTime - 1;
          
          // Update timestamp in localStorage
          localStorage.setItem('pomodoroLastUpdated', Date.now().toString());
          
          if (newTime === 0) {
            // Timer completed
            clearInterval(timerRef.current);
            handleTimerComplete();
          }
          
          return newTime;
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
  
  // FIXED: Update resetTimer function to properly handle reset
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
    localStorage.setItem('pomodoroTotalTime', resetTime.toString());
    localStorage.setItem('pomodoroTime', resetTime.toString());
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