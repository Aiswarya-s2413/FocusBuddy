import React, { useState } from 'react';
import { Card } from "../../components/ui/card";
import { Edit, Trash2, List } from "lucide-react";
import { Button } from "../../components/ui/button";
import { ScrollArea } from "../../components/ui/scroll-area";
import { Dialog,
    DialogTrigger,
    DialogContent,
    DialogFooter,
    DialogTitle,
    DialogDescription,
 } from "../../components/ui/dialog";

const getMoodEmoji = (mood) => {
  switch (mood) {
    case 'happy':
      return '😊';
    case 'neutral':
      return '😐';
    case 'sad':
      return '😢';
    default:
      return '😐';
  }
};

export const JournalEntries = ({ entries, onEdit, onDelete }) => {
  const [entryToDelete, setEntryToDelete] = useState(null);

  return (
    <>
      <Card className="mt-8 p-6">
        <div className="flex items-center gap-2 mb-6">
          <List className="h-5 w-5 text-[#9b87f5]" />
          <h2 className="text-xl font-semibold">Journal History</h2>
        </div>

        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-4">
            {entries.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No journal entries yet. Write your first entry above!
              </p>
            ) : (
              entries.map((entry) => {
                const entryDate = new Date(entry.date);
                return (
                  <Card key={entry.id} className="p-4 hover:bg-accent/50 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col items-center">
                          <span className="text-2xl mb-1" aria-hidden="true">
                            {getMoodEmoji(entry.mood)}
                          </span>
                          <span className="text-xs text-muted-foreground capitalize">
                            {entry.mood}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          {entry.description && (
                            <span className="text-sm text-muted-foreground mb-1 italic">
                              {entry.description}
                            </span>
                          )}
                          <span className="text-sm font-medium">
                            {entryDate.toLocaleDateString('en-US', {
                              weekday: 'long'
                            })}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {entryDate.toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onEdit(entry)}
                          className="h-8 w-8 hover:bg-[#9b87f5]/10"
                        >
                          <Edit className="h-4 w-4" />
                          <span className="sr-only">Edit entry</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEntryToDelete(entry)}
                          className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-100"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Delete entry</span>
                        </Button>
                      </div>
                    </div>
                    <div className="mt-4 pl-14">
                      <p className="text-gray-700 whitespace-pre-wrap">{entry.content}</p>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </ScrollArea>
      </Card>

      {/* Delete Confirmation Dialog */}
      {entryToDelete && (
        <Dialog open={!!entryToDelete} onOpenChange={(open) => !open && setEntryToDelete(null)}>
          <DialogContent>
  <DialogTitle>Confirm Deletion</DialogTitle>
  <DialogDescription>
    Are you sure you want to delete this journal entry? This action cannot be undone.
  </DialogDescription>
  <DialogFooter className="mt-6 flex justify-end gap-2">
    <Button variant="outline" onClick={() => setEntryToDelete(null)}>
      Cancel
    </Button>
    <Button
      variant="destructive"
      onClick={() => {
        onDelete(entryToDelete.id);
        setEntryToDelete(null);
      }}
    >
      Delete
    </Button>
  </DialogFooter>
</DialogContent>
        </Dialog>
      )}
    </>
  );
};
