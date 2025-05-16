import React from 'react';
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Textarea } from "../../components/ui/textarea";
import { Calendar } from "lucide-react";

export const JournalEditor = ({
  content,
  onContentChange,
  date,
  isEditing = false,
}) => {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          
        </div>
      </div>
      <Textarea
        placeholder="What's on your mind today?"
        className="min-h-[200px] mb-4"
        value={content}
        onChange={(e) => onContentChange(e.target.value)}
      />
      
    </Card>
  );
};
