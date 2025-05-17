import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";

const ViewJournalModal = ({ isOpen, onClose, journal }) => {
  if (!journal) return null;

  // Format date for display
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  // Map mood to appropriate color
  const getMoodBadgeClass = (mood) => {
    switch(mood) {
      case 'happy':
        return 'bg-green-100 text-green-800 hover:bg-green-200';
      case 'excited':
        return 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200';
      case 'neutral':
        return 'bg-blue-100 text-blue-800 hover:bg-blue-200';
      case 'sad':
        return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200';
      case 'anxious':
        return 'bg-amber-100 text-amber-800 hover:bg-amber-200';
      case 'angry':
        return 'bg-red-100 text-red-800 hover:bg-red-200';
      default:
        return 'bg-gray-100 text-gray-800 hover:bg-gray-200';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Journal Entry Details
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-gray-500">User</p>
            <p className="text-base font-medium">{journal.user.username}</p>
          </div>
          
          <div className="flex justify-between">
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium text-gray-500">Journal Date</p>
              <p className="text-base">{formatDate(journal.date)}</p>
            </div>
            
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium text-gray-500">Created On</p>
              <p className="text-base">{formatDate(journal.created_at)}</p>
            </div>
          </div>
          
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-gray-500">Mood</p>
            <Badge className={getMoodBadgeClass(journal.mood)}>
              {journal.mood.charAt(0).toUpperCase() + journal.mood.slice(1)}
            </Badge>
          </div>
          
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-gray-500">Status</p>
            <Badge
              className={
                !journal.is_blocked
                  ? "bg-green-100 text-green-800 hover:bg-green-200"
                  : "bg-red-100 text-red-800 hover:bg-red-200"
              }
            >
              {!journal.is_blocked ? "Active" : "Blocked"}
            </Badge>
          </div>
          
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-gray-500">Description</p>
            <div className="border rounded-md p-3 bg-gray-50 min-h-24 max-h-64 overflow-y-auto">
              <p className="text-base whitespace-pre-wrap">{journal.description}</p>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ViewJournalModal;