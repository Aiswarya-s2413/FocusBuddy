import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { userAxios } from '../../utils/axios';
import { TimerDisplay } from '../../components/pomodoro/TimerDisplay';
import { TimerControls } from '../../components/pomodoro/TimerControls';
import { TimerSettings } from '../../components/pomodoro/TimerSettings';
import { ProgressTracker } from '../../components/pomodoro/ProgressTracker';
import { MotivationalWidget } from '../../components/pomodoro/MotivationalWidget';
import { TaskForm } from '../../components/pomodoro/TaskForm';
import { usePomodoro } from '../../hooks/usePomodoro';

const PomodoroTimer = () => {
  const [showTaskForm, setShowTaskForm] = useState(true);
  const [tasks, setTasks] = useState([]);
  const { user } = useSelector((state) => state.user);

  // useEffect(() => {
  //   console.log('PomodoroTimer - User:', user);

  // // Fetch user-specific data
  //   userAxios.get('/pomodoro')
  //     .then((response) => {
  //       console.log('Pomodoro data:', response.data);
  //     })
  //     .catch((error) => {
  //       console.error('Error fetching pomodoro data:', error);
  //     });
  // }, [user]);

  // Define the handlers first
  const handleCompletePomodoro = async (taskId) => {
    try {
      await userAxios.post(`/tasks/${taskId}/complete_pomodoro/`);
      const updatedTasks = tasks.map(task => 
        task.id === taskId ? {...task, completed_pomodoros: task.completed_pomodoros + 1} : task
      );
      setTasks(updatedTasks);
    } catch (error) {
      console.error('Error completing pomodoro:', error);
    }
  };

  const handleCompleteSession = async (sessionId) => {
    try {
      await userAxios.post(`/sessions/${sessionId}/complete/`);
    } catch (error) {
      console.error('Error completing session:', error);
    }
  };

  // Then use them in the hook
  const {
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
  } = usePomodoro({
    onCompletePomodoro: handleCompletePomodoro,
    onCompleteSession: handleCompleteSession
  });

  // Fetch user's tasks on component mount
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        console.log('Fetching tasks...'); // Debugging: Log when the function starts
        const response = await userAxios.get('/tasks/');
        console.log('Tasks fetched successfully:', response.data); // Debugging: Log successful response
        setTasks(response.data);
      } catch (error) {
        console.error('Error fetching tasks:', error); // Debugging: Log the error
        console.log('Error details:', { // Debugging: Log detailed error info
          message: error.message,
          status: error.response?.status,
          data: error.response?.data,
          headers: error.response?.headers,
        });
      }
    };
    fetchTasks();
  }, []);

  const handleTaskSubmit = async (task) => {
    try {
      // Create new task
      const response = await userAxios.post('/tasks/', task);
      setTaskForTimer(response.data);
      setShowTaskForm(false);
      setTasks([...tasks, response.data]);
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };

  const handleSettingsSave = async (newSettings) => {
    try {
      await userAxios.put('/settings/', newSettings);
      updateSettings(newSettings);
    } catch (error) {
      console.error('Error updating settings:', error);
    }
  };

  const handleResetTask = () => {
    resetTimer();
    setShowTaskForm(true);
  };

  return (
    <div className="min-h-screen bg-[#F8F6FB] py-8">
      <div className="container mx-auto px-4">
        <h1 className="text-2xl font-bold text-[#6E59A5] mb-6">Pomodoro Timer</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {showTaskForm ? (
              <TaskForm onTaskSubmit={handleTaskSubmit} />
            ) : (
              <>
                <div className="bg-white rounded-xl shadow-sm p-8">
                  {currentTask && (
                    <div className="mb-6">
                      <h2 className="text-xl font-semibold text-[#6E59A5]">{currentTask.title}</h2>
                      <p className="text-gray-600">
                        Pomodoros: {currentTask.completedPomodoros} of {currentTask.estimatedPomodoros} completed
                      </p>
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
                    onReset={handleResetTask}
                    sessionType={sessionType}
                    onSessionTypeChange={setSessionType}
                  />
                </div>
                <ProgressTracker
                  currentSession={currentSession}
                  totalSessions={totalSessions}
                />
                <MotivationalWidget />
              </>
            )}
          </div>

          <div className="lg:col-span-1">
            <TimerSettings
              onSaveSettings={handleSettingsSave}
              defaultSettings={settings}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PomodoroTimer;
