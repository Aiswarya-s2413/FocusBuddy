import React from 'react';
import { Button } from "../../components/ui/button";
import { Smile, Meh, Frown, Star, AlertCircle, Zap } from "lucide-react";

const ICON_MAP = {
  happy: <Smile className="h-6 w-6" />,
  neutral: <Meh className="h-6 w-6" />,
  sad: <Frown className="h-6 w-6" />,
  excited: <Star className="h-6 w-6" />,
  anxious: <AlertCircle className="h-6 w-6" />,
  angry: <Zap className="h-6 w-6" />,
};

export const MoodSelector = ({ selectedMood, onMoodSelect, moods }) => {
  return (
    <div className="p-4 border rounded-md shadow-sm">
      <h3 className="text-lg font-semibold mb-3">How are you feeling today?</h3>
      <div className="flex justify-center gap-4 flex-wrap">
        {moods.map(({ key, label }) => (
          <Button
            key={key}
            variant={selectedMood === key ? "default" : "outline"}
            className={`flex flex-col items-center p-4 ${
              selectedMood === key ? "bg-[#9b87f5] text-white" : ""
            }`}
            onClick={() => onMoodSelect(key)}
          >
            {ICON_MAP[key] || <Meh className="h-6 w-6" />}
            <span className="mt-2">{label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
};
