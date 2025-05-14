import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';

export const Task = {
  id: String,
  title: String,
  estimatedPomodoros: Number,
  completedPomodoros: Number
};

export const usePomodoro = () => {
  // Default settings
  const [settings, setSettings] = useState({
    focusDuration: 25,
    shortBreakDuration: 5,
    longBreakDuration: 15,
    sessionsBeforeLongBreak: 4,
    autoStartNextSession: false,
    playSoundWhenSessionEnds: true,
  });
  
  const [time, setTime] = useState(settings.focusDuration * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionType, setSessionType] = useState('focus');
  const [currentSession, setCurrentSession] = useState(1);
  const [totalSessions, setTotalSessions] = useState(settings.sessionsBeforeLongBreak);
  const [currentTask, setCurrentTask] = useState(null);
  const [error, setError] = useState(null);
  
  const timerRef = useRef();

  // Load user settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await axios.get('/api/user/pomodoro/settings/');
        setSettings(response.data);
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    };
    loadSettings();
  }, []);

  // Create new task
  const createTask = async (taskData) => {
    try {
      const response = await axios.post('/api/user/pomodoro/tasks/', taskData);
      setCurrentTask(response.data);
      return response.data;
    } catch (error) {
      setError(error.response?.data || 'Failed to create task');
      throw error;
    }
  };

  // Complete a pomodoro session
  const completePomodoro = async () => {
    if (!currentTask) return;
    
    try {
      await axios.post(`/api/user/pomodoro/tasks/${currentTask.id}/complete_pomodoro/`);
      setCurrentTask(prev => ({
        ...prev,
        completedPomodoros: prev.completedPomodoros + 1
      }));
    } catch (error) {
      console.error('Error completing pomodoro:', error);
    }
  };

  // Handle timer completion
  const handleTimerComplete = useCallback(async () => {
    clearInterval(timerRef.current);
    setIsRunning(false);
    
    if (settings.playSoundWhenSessionEnds) {
      // Play sound logic could be implemented here
      console.log('Playing sound');
    }
    
    if (sessionType === 'focus') {
      await completePomodoro();
      
      if (currentSession >= settings.sessionsBeforeLongBreak) {
        setSessionType('longBreak');
        setCurrentSession(1);
      } else {
        setSessionType('shortBreak');
        setCurrentSession(prev => prev + 1);
      }
    } else {
      setSessionType('focus');
    }
    
    if (settings.autoStartNextSession) {
      setTimeout(() => {
        startTimer();
      }, 1000);
    }
  }, [sessionType, currentSession, settings, currentTask]);

  const startTimer = useCallback(() => {
    if (!isRunning) {
      setIsRunning(true);
      timerRef.current = window.setInterval(() => {
        setTime(prevTime => {
          if (prevTime <= 1) {
            handleTimerComplete();
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
    }
  }, [isRunning, handleTimerComplete]);

  const pauseTimer = useCallback(() => {
    if (isRunning) {
      clearInterval(timerRef.current);
      setIsRunning(false);
    }
  }, [isRunning]);

  const resetTimer = useCallback(() => {
    clearInterval(timerRef.current);
    setIsRunning(false);
    let duration = settings.focusDuration;
    if (sessionType === 'shortBreak') duration = settings.shortBreakDuration;
    if (sessionType === 'longBreak') duration = settings.longBreakDuration;
    setTime(duration * 60);
  }, [sessionType, settings]);

  const updateSettings = useCallback(async (newSettings) => {
    try {
      await axios.put('/api/user/pomodoro/settings/', newSettings);
      setSettings(newSettings);
      setTotalSessions(newSettings.sessionsBeforeLongBreak);
      resetTimer();
    } catch (error) {
      setError(error.response?.data || 'Failed to update settings');
      throw error;
    }
  }, [resetTimer]);

  const setTaskForTimer = useCallback((task) => {
    setCurrentTask(task);
    setSessionType('focus');
    setCurrentSession(1);
    resetTimer();
  }, [resetTimer]);

  const switchSessionType = useCallback((type) => {
    if (sessionType !== type) {
      setSessionType(type);
      resetTimer();
    }
  }, [sessionType, resetTimer]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  return {
    time,
    isRunning,
    sessionType,
    currentSession,
    totalSessions,
    settings,
    currentTask,
    error,
    startTimer,
    pauseTimer,
    resetTimer,
    setSessionType: switchSessionType,
    updateSettings,
    setTaskForTimer,
    createTask
  };
};
