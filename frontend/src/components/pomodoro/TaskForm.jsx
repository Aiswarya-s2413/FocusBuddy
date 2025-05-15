import React, { useState } from 'react';
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { useToast } from "../ui/use-toast";
import { Textarea } from "../ui/textarea"; // You'll need to import this component

export const TaskForm = ({ onTaskSubmit }) => {
  const { toast } = useToast();
  const [taskTitle, setTaskTitle] = useState('');
  const [description, setDescription] = useState('');
  const [estimatedTime, setEstimatedTime] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!taskTitle.trim()) {
      toast({
        title: "Task title required",
        description: "Please enter a task title.",
        variant: "destructive"
      });
      return;
    }

    const timeInMinutes = parseInt(estimatedTime, 10);
    if (isNaN(timeInMinutes) || timeInMinutes <= 0) {
      toast({
        title: "Invalid time",
        description: "Please enter a valid positive number for the estimated time.",
        variant: "destructive"
      });
      return;
    }

    // Now match the backend expected format with snake_case keys
    const newTask = {
      title: taskTitle,
      description: description, // Added description field
      estimated_minutes: timeInMinutes, // Changed to match backend field name
      // No need to send estimated_pomodoros, backend treats it as read-only
      // No need to send completed_pomodoros, backend treats it as read-only
    };

    onTaskSubmit(newTask);

    // Reset form
    setTaskTitle('');
    setDescription('');
    setEstimatedTime('');

    toast({
      title: "Task added",
      description: `${taskTitle} added with an estimated time of ${timeInMinutes} minutes.`
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <h3 className="text-lg font-semibold text-[#6E59A5] mb-4">Add a New Task</h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="task-title">Task Title</Label>
          <Input
            id="task-title"
            placeholder="What are you working on?"
            value={taskTitle}
            onChange={(e) => setTaskTitle(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="task-description">Description (Optional)</Label>
          <Textarea
            id="task-description"
            placeholder="Add details about this task"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="estimated-time">Estimated Time (minutes)</Label>
          <Input
            id="estimated-time"
            type="number"
            placeholder="How long will this take?"
            value={estimatedTime}
            onChange={(e) => setEstimatedTime(e.target.value)}
            min="1"
          />
        </div>

        <Button
          type="submit"
          className="w-full bg-[#9b87f5] hover:bg-[#7E69AB]"
        >
          Start Task
        </Button>
      </form>
    </div>
  );
};