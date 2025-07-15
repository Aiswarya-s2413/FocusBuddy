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
  const [titleError, setTitleError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();

    const trimmedTitle = taskTitle.trim();
    // Check for empty
    if (!trimmedTitle) {
      setTitleError("Please enter a task title.");
      toast({
        title: "Task title required",
        description: "Please enter a task title.",
        variant: "destructive"
      });
      return;
    }
    // Check for minimum 3 characters (excluding spaces)
    if (trimmedTitle.replace(/\s/g, '').length < 3) {
      setTitleError("Task title must be at least 3 characters.");
      toast({
        title: "Task title too short",
        description: "Task title must be at least 3 characters.",
        variant: "destructive"
      });
      return;
    }
    // Check for at least one alphanumeric character
    if (!/[a-zA-Z0-9]/.test(trimmedTitle)) {
      setTitleError("Task title must contain at least one letter or number.");
      toast({
        title: "Invalid task title",
        description: "Task title must contain at least one letter or number.",
        variant: "destructive"
      });
      return;
    }

    setTitleError(''); // Clear error on success

    // Now match the backend expected format with snake_case keys
    const newTask = {
      title: taskTitle,
      description: description, // Added description field
      
    };

    onTaskSubmit(newTask);

    // Reset form
    setTaskTitle('');
    setDescription('');

    toast({
      title: "Task added",
      description: `${taskTitle} added.`
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
            onChange={(e) => {
              setTaskTitle(e.target.value);
              if (titleError) setTitleError('');
            }}
          />
          {titleError && (
            <p className="text-red-600 text-sm mt-1">{titleError}</p>
          )}
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