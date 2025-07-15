import React, { useState, useEffect, useRef } from 'react';
import { TimerDisplay } from '../../components/pomodoro/TimerDisplay';
import { TimerControls } from '../../components/pomodoro/TimerControls';
import { ProgressTracker } from '../../components/pomodoro/ProgressTracker';
import { MotivationalWidget } from '../../components/pomodoro/MotivationalWidget';
import { TaskForm } from '../../components/pomodoro/TaskForm';
import { userAxios } from '../../utils/axios';
import { useSimpleToast } from '../../components/ui/toast';

const PomodoroTimer = ({ onCompletePomodoro, onCompleteSession }) => {
  // Default settings
  const defaultSettings = {
    focusDuration: 25,
    autoStartNextSession: false,
    playSoundWhenSessionEnds: true
  };

  // State
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

  const [currentTask, setCurrentTask] = useState(() => {
    const savedCurrentTask = localStorage.getItem('pomodoroCurrentTask');
    return savedCurrentTask ? JSON.parse(savedCurrentTask) : null;
  });

  const [timerVisible, setTimerVisible] = useState(() => {
    const savedTimerVisible = localStorage.getItem('pomodoroTimerVisible');
    return savedTimerVisible === 'true';
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tasks, setTasks] = useState([]);

  // References
  const timerRef = useRef(null);
  const totalTimeRef = useRef(() => {
    const savedTotalTime = localStorage.getItem('pomodoroTotalTime');
    return savedTotalTime ? parseInt(savedTotalTime, 10) : defaultSettings.focusDuration * 60;
  });

  // Store last updated timestamp to calculate elapsed time during page refresh
  const lastUpdatedRef = useRef(() => {
    const savedLastUpdated = localStorage.getItem('pomodoroLastUpdated');
    return savedLastUpdated ? parseInt(savedLastUpdated, 10) : Date.now();
  });

  const [sessionStartTime, setSessionStartTime] = useState(null); // Track when timer starts

  const { toast, ToastContainer } = useSimpleToast();

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
    if (isRunning) {
      const lastUpdated = parseInt(localStorage.getItem('pomodoroLastUpdated') || Date.now(), 10);
      const now = Date.now();
      const elapsedSeconds = Math.floor((now - lastUpdated) / 1000);
      if (elapsedSeconds > 0) {
        const newTime = Math.max(0, time - elapsedSeconds);
        setTime(newTime);
        if (newTime === 0) {
          handleTimerComplete();
        }
      }
    }
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

  // Effect to handle timer duration (always focus)
  useEffect(() => {
    // Always use focus duration
    const initialTime = settings.focusDuration * 60;
    totalTimeRef.current = initialTime;
    localStorage.setItem('pomodoroTotalTime', initialTime.toString());
    setTime(initialTime);
    setIsRunning(false);
  }, [settings.focusDuration]);

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
          localStorage.setItem('pomodoroLastUpdated', Date.now().toString());
          if (newTime === 0) {
            clearInterval(timerRef.current);
            handleTimerComplete();
          }
          return newTime;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRunning]);

  // Save Pomodoro session to backend
  const savePomodoroSession = async ({ completed }) => {
    if (!currentTask || !sessionStartTime) return;
    try {
      setIsLoading(true);
      setError(null);
      const endTime = new Date();
      const durationMs = endTime - new Date(sessionStartTime);
      const durationMinutes = Math.max(1, Math.round(durationMs / 60000)); // at least 1 min
      await userAxios.post('/sessions/', {
        task: currentTask.id,
        session_type: 'focus',
        start_time: new Date(sessionStartTime).toISOString(),
        end_time: endTime.toISOString(),
        duration_minutes: completed ? settings.focusDuration : durationMinutes,
        is_completed: completed,
      });
      // Mark the task's pomodoro as completed if requested
      if (completed && currentTask.id) {
        await userAxios.post(`/tasks/${currentTask.id}/complete_pomodoro/`);
      }
    } catch (err) {
      setError('Failed to save Pomodoro session.');
      console.error('Pomodoro session save error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Handler for timer completion
  const handleTimerComplete = async () => {
    await savePomodoroSession({ completed: true });
    toast.success('Session ended successfully.');
    if (currentTask && currentTask.id) {
      try {
        const updatedTask = {
          ...currentTask,
          completed_pomodoros: currentTask.completed_pomodoros + 1
        };
        setCurrentTask(updatedTask);
        onCompletePomodoro && onCompletePomodoro(currentTask.id);
      } catch (error) {
        console.error('Error updating task pomodoros:', error);
      }
    }
    if (settings.autoStartNextSession) {
      setIsRunning(true);
    }
    if (settings.playSoundWhenSessionEnds) {
      // Play sound logic would go here
    }
    onCompleteSession && onCompleteSession();
    setSessionStartTime(null);
    setCurrentTask(null);
    setTimerVisible(false);
  };

  // Timer controls
  const startTimer = () => {
    if (!isRunning) {
      setSessionStartTime(new Date());
      setIsRunning(true);
    }
  };
  const pauseTimer = () => setIsRunning(false);

  const resetTimer = () => {
    pauseTimer();
    const resetTime = settings.focusDuration * 60;
    setTime(resetTime);
    totalTimeRef.current = resetTime;
    localStorage.setItem('pomodoroTotalTime', resetTime.toString());
    localStorage.setItem('pomodoroTime', resetTime.toString());
  };

  const updateSettings = (newSettings) => {
    setSettings(prev => ({
      ...prev,
      ...newSettings
    }));
    resetTimer();
  };

  const setTaskForTimer = (task) => {
    setCurrentTask(task);
    setTimerVisible(true);
    resetTimer();
  };

  const handleTaskSubmit = async (task) => {
    try {
      setIsLoading(true);
      setError(null);
      const taskData = {
        title: task.title,
        description: task.description || '',
      };
      const response = await userAxios.post('/tasks/', taskData);
      const newTask = response.data;
      setTaskForTimer(newTask);
      setTasks(prevTasks => [...prevTasks, newTask]);
    } catch (error) {
      console.error('Error creating task:', error);
      if (error.response && error.response.data) {
        console.error('Error details:', error.response.data);
      }
      setError('Failed to create task. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetAndNewTask = () => {
    pauseTimer();
    setCurrentTask(null);
    setTimerVisible(false);
  };

  // Stop timer and save session as not completed
  const stopTimer = async () => {
    setIsRunning(false);
    await savePomodoroSession({ completed: false });
    toast.success('Session ended successfully.');
    setSessionStartTime(null);
    setCurrentTask(null);
    setTimerVisible(false);
    resetTimer();
  };

  return (
    <div className="space-y-8">
      <ToastContainer />
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
            {/* <div className="flex justify-between mt-2 text-sm text-gray-500"> */}
            {/* <span>Estimated: {currentTask.estimated_minutes} minutes</span> */}
            {/* <span>Completed Pomodoros: {currentTask.completed_pomodoros}</span> */}
            {/* </div> */}
          </div>

          <TimerDisplay
            time={time}
            sessionType="focus"
            currentSession={1}
            totalSessions={1}
            currentTask={currentTask}
          />

          <TimerControls
            isRunning={isRunning}
            onStart={startTimer}
            onPause={pauseTimer}
            onReset={resetTimer}
            onStop={stopTimer}
            sessionType="focus"
            currentSessionId={null}
            onComplete={async () => {
              // Mark session as completed when user clicks 'Complete'
              await savePomodoroSession({ completed: true });
              toast.success('Session marked as completed.');
              if (currentTask && currentTask.id) {
                try {
                  const updatedTask = {
                    ...currentTask,
                    completed_pomodoros: currentTask.completed_pomodoros + 1
                  };
                  setCurrentTask(updatedTask);
                  onCompletePomodoro && onCompletePomodoro(currentTask.id);
                } catch (error) {
                  console.error('Error updating task pomodoros:', error);
                }
              }
              if (settings.autoStartNextSession) {
                setIsRunning(true);
              }
              if (settings.playSoundWhenSessionEnds) {
                // Play sound logic would go here
              }
              onCompleteSession && onCompleteSession();
              setSessionStartTime(null);
              setCurrentTask(null);
              setTimerVisible(false);
            }}
          />

          <div className="mt-8 space-y-6">
            <ProgressTracker
              currentSession={1}
              totalSessions={1}
            />

            <MotivationalWidget />
          </div>

          {/* Button to go back to task form */}
          {/* <button
            onClick={handleResetAndNewTask}
            className="mt-6 w-full py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors"
            type="button"
          >
            Create New Task
          </button> */}
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
    if (currentTask) {
      localStorage.setItem('pomodoroCurrentTask', JSON.stringify(currentTask));
    } else {
      localStorage.removeItem('pomodoroCurrentTask');
    }
  }, [currentTask]);

  // Effect to handle time updates during page refresh
  useEffect(() => {
    if (isRunning) {
      const lastUpdated = parseInt(localStorage.getItem('pomodoroLastUpdated') || Date.now(), 10);
      const now = Date.now();
      const elapsedSeconds = Math.floor((now - lastUpdated) / 1000);
      if (elapsedSeconds > 0) {
        const newTime = Math.max(0, time - elapsedSeconds);
        setTime(newTime);
        if (newTime === 0) {
          handleTimerComplete();
        }
      }
    }
    const intervalId = setInterval(() => {
      localStorage.setItem('pomodoroLastUpdated', Date.now().toString());
    }, 1000);
    return () => clearInterval(intervalId);
  }, []);

  // Effect to handle timer duration (always focus)
  useEffect(() => {
    // Always use focus duration
    const initialTime = settings.focusDuration * 60;
    totalTimeRef.current = initialTime;
    localStorage.setItem('pomodoroTotalTime', initialTime.toString());
    setTime(initialTime);
    setIsRunning(false);
  }, [settings.focusDuration]);

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
          localStorage.setItem('pomodoroLastUpdated', Date.now().toString());
          if (newTime === 0) {
            clearInterval(timerRef.current);
            handleTimerComplete();
          }
          return newTime;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRunning]);

  // Handler for timer completion
  const handleTimerComplete = async () => {
    await savePomodoroSession({ completed: true });
    if (currentTask && currentTask.id) {
      onCompletePomodoro && onCompletePomodoro(currentTask.id);
    }
    if (settings.autoStartNextSession) {
      setIsRunning(true);
    }
    if (settings.playSoundWhenSessionEnds) {
      // Play sound logic would go here
    }
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
    resetTime = settings.focusDuration * 60;

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
    settings,
    currentTask,
    startTimer,
    pauseTimer,
    resetTimer,
    updateSettings,
    setTaskForTimer
  };
};

export default PomodoroTimer;