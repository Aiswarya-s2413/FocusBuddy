import React, { useState, useEffect } from 'react';
import { MoodSelector } from '../../components/journal/MoodSelector';
import { JournalEditor } from '../../components/journal/JournalEditor';
import { JournalDatePicker } from '../../components/journal/JournalDatePicker';
import { JournalEntries } from '../../components/journal/JournalEntries';
import { useToast } from "../../hooks/use-toast";
import { userAxios } from '../../utils/axios';

const Journal = () => {
  console.log("Journal component initialized");
  const { toast } = useToast();

  const [moods, setMoods] = useState([]);
  const [selectedMood, setSelectedMood] = useState(null);
  const [content, setContent] = useState('');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [entries, setEntries] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [userId, setUserId] = useState(null);

  // Fetch moods, entries, and user info on mount
  useEffect(() => {
    fetchMoods();
    fetchEntries();
    fetchUserInfo();
  }, []);

  // Debug log to see if component is rendering properly
  console.log("Journal Component Rendering", { 
    moods, 
    selectedMood, 
    content, 
    currentDate,
    entries: entries.length,
    userId
  });

  const fetchUserInfo = async () => {
    try {
      const response = await userAxios.get('/update-profile/');
      setUserId(response.data.id);
      console.log("User ID fetched:", response.data.id);
    } catch (error) {
      console.error("Error fetching user info:", error);
      toast({
        title: "Error loading user information",
        description: "Unable to load your user profile. Please refresh or try again later.",
        variant: "destructive",
      });
    }
  };

  const fetchMoods = async () => {
    try {
      const response = await userAxios.get('/moods/');
      setMoods(response.data);
    } catch (error) {
      toast({
        title: "Error loading moods",
        description: error.message || "Failed to load moods",
        variant: "destructive",
      });
    }
  };

  const fetchEntries = async () => {
    try {
      const response = await userAxios.get('/journals/');
      setEntries(response.data);
    } catch (error) {
      toast({
        title: "Error loading journals",
        description: error.message || "Failed to load entries",
        variant: "destructive",
      });
    }
  };

  const handleSave = async () => {
    // Debug log at the start of handleSave
    console.log("handleSave function called!");
    
    console.log(" Checking selectedMood:", selectedMood, typeof selectedMood);
    
    if (!selectedMood || !content.trim()) {
      toast({
        title: "Missing Information",
        description: "Please select a mood and write your entry before saving.",
        variant: "destructive",
      });
      console.log(" Validation failed: missing mood or content");
      return;
    }

    if (!userId) {
      toast({
        title: "User Not Loaded",
        description: "Your user information isn't available. Please refresh the page.",
        variant: "destructive",
      });
      console.log(" User ID not available");
      return;
    }
  
    const payload = {
      description: content,
      date: currentDate.toISOString().split('T')[0], // YYYY-MM-DD
     
    };

    // Ensure the mood ID is correctly set based on different possible formats
    if (selectedMood && typeof selectedMood === 'object' && selectedMood.id) {
      payload.mood = selectedMood.id;
      console.log("Found mood as object with ID:", selectedMood.id);
    } else if (selectedMood && typeof selectedMood === 'number') {
      payload.mood = selectedMood;
      console.log("Found mood as number:", selectedMood);
    } else if (selectedMood && typeof selectedMood === 'string') {
      // If selectedMood is a string (like 'happy'), try to find its ID from the moods array
      const matchingMood = moods.find(mood => mood.name === selectedMood || mood.id === selectedMood);
      if (matchingMood) {
        payload.mood = matchingMood.id;
        console.log("Found matching mood ID for string:", matchingMood.id);
      } else {
        // If no match found, use the string directly (API might support this)
        payload.mood = selectedMood;
        console.log("Using mood string directly:", selectedMood);
      }
    } else {
      toast({
        title: "Invalid Mood Selection",
        description: "Please select a valid mood before saving.",
        variant: "destructive",
      });
      console.log(" Invalid mood format:", selectedMood);
      return;
    }

    console.log(" Submitting Journal Entry:", payload);
  
    try {
      let response;
  
      if (isEditing && editingEntry) {
        console.log("Editing entry ID:", editingEntry.id);
        response = await userAxios.put(`/journals/${editingEntry.id}/`, payload);
        console.log("Update response:", response.data);
        setEntries(entries.map(entry => (entry.id === editingEntry.id ? response.data : entry)));
        setIsEditing(false);
        setEditingEntry(null);
        toast({
          title: "Entry Updated",
          description: "Your journal entry has been updated successfully.",
        });
      } else {
        console.log(" Creating new journal entry");
        response = await userAxios.post('/journals/', payload);
        console.log(" Create response:", response.data);
        setEntries([response.data, ...entries]);
        toast({
          title: "Entry Saved",
          description: "Your journal entry has been saved successfully.",
        });
      }
  
      // Reset form
      setContent('');
      setSelectedMood(null);
      setCurrentDate(new Date());
  
    } catch (error) {
      const errorResponse = error.response?.data;
      console.error(" Error saving journal entry:", errorResponse);
      console.error("Full error:", error);
  
      toast({
        title: "Error Saving Entry",
        description: JSON.stringify(errorResponse || error.message || "Unknown error occurred"),
        variant: "destructive",
      });
    }
  };
  
  const handleEdit = (entry) => {
    setIsEditing(true);
    setEditingEntry(entry);
    setContent(entry.description);
    setSelectedMood(entry.mood);
    setCurrentDate(new Date(entry.date));
  };
  
  const handleDelete = async (id) => {
    try {
      // Delete the entry via API
      await userAxios.delete(`/journals/${id}/`);
  
      // Update local state after deletion
      setEntries((prev) => prev.filter((entry) => entry.id !== id));
    } catch (error) {
      console.error("Failed to delete entry:", error);
    }
  };
  

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">My Journal</h2>

      

      <MoodSelector
        selectedMood={selectedMood}
        onMoodSelect={setSelectedMood}
        moods={moods}
      />
      <JournalDatePicker date={currentDate} onChange={setCurrentDate} />
      <JournalEditor content={content} onContentChange={setContent}  />

      <div className="flex justify-end">
        <button
          onClick={() => {
            console.log("Button clicked!");
            handleSave();
          }}
          className="bg-[#9b87f5] hover:bg-[#7E69AB] text-white px-4 py-2 rounded"
          type="button"
        >
          {isEditing ? 'Update Entry' : 'Save Entry'}
        </button>
      </div>

      <JournalEntries entries={entries} onEdit={handleEdit} onDelete={handleDelete} />
    </div>
  );
};

export default Journal;