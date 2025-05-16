import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, Clock, Video, X, MessageSquare, Star } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

const MySessionsTab = ({ sessions }) => {
  const { toast } = useToast();
  const [cancelDialog, setCancelDialog] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [feedbackDialog, setFeedbackDialog] = useState(false);

  const handleCancelSession = () => {
    toast({
      title: "Session Cancelled",
      description: "Your mentoring session has been cancelled successfully.",
    });
    setCancelDialog(false);
  };

  const handleProvideFeedback = () => {
    toast({
      title: "Feedback Submitted",
      description: "Thank you for your feedback!",
    });
    setFeedbackDialog(false);
  };

  return (
    <>
      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList className="grid grid-cols-2 mb-6">
          <TabsTrigger value="upcoming">Upcoming Sessions</TabsTrigger>
          <TabsTrigger value="past">Past Sessions</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming">
          {sessions.upcoming.length === 0 ? (
            <div className="text-center py-10">
              <h3 className="text-gray-500 mb-2">No upcoming sessions</h3>
              <p className="text-sm text-gray-400">Book a session with one of our mentors</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {sessions.upcoming.map((session) => (
                <Card key={session.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={session.mentor.profilePicture} alt={session.mentor.name} />
                        <AvatarFallback>{session.mentor.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h3 className="font-medium">{session.mentor.name}</h3>
                        <p className="text-sm text-gray-600">{session.mentor.specialization}</p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                          <div className="flex items-center text-sm">
                            <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                            <span>{new Date(session.dateTime).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center text-sm">
                            <Clock className="h-4 w-4 mr-2 text-gray-500" />
                            <span>{new Date(session.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <div className="flex items-center text-sm">
                            <Video className="h-4 w-4 mr-2 text-gray-500" />
                            <span>{session.mode}</span>
                          </div>
                          <div className="flex items-center text-sm">
                            <Clock className="h-4 w-4 mr-2 text-gray-500" />
                            <span>{session.duration}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between bg-gray-50 border-t px-6 py-3">
                    <Button variant="default" className="bg-purple-600 hover:bg-purple-700">
                      Join Session
                    </Button>
                    <Button
                      variant="outline"
                      className="text-red-500 border-red-200 hover:bg-red-50"
                      onClick={() => {
                        setSelectedSession(session);
                        setCancelDialog(true);
                      }}
                    >
                      <X className="h-4 w-4 mr-1" /> Cancel
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="past">
          {sessions.past.length === 0 ? (
            <div className="text-center py-10">
              <h3 className="text-gray-500 mb-2">No past sessions</h3>
              <p className="text-sm text-gray-400">Your completed sessions will appear here</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {sessions.past.map((session) => (
                <Card key={session.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={session.mentor.profilePicture} alt={session.mentor.name} />
                        <AvatarFallback>{session.mentor.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <h3 className="font-medium">{session.mentor.name}</h3>
                        <p className="text-sm text-gray-600">{session.mentor.specialization}</p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                          <div className="flex items-center text-sm">
                            <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                            <span>{new Date(session.dateTime).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center text-sm">
                            <Clock className="h-4 w-4 mr-2 text-gray-500" />
                            <span>{new Date(session.dateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <div className="flex items-center text-sm">
                            <Video className="h-4 w-4 mr-2 text-gray-500" />
                            <span>{session.mode}</span>
                          </div>
                          <div className="flex items-center text-sm">
                            <Clock className="h-4 w-4 mr-2 text-gray-500" />
                            <span>{session.duration}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-end bg-gray-50 border-t px-6 py-3">
                    {!session.feedbackProvided ? (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSelectedSession(session);
                          setFeedbackDialog(true);
                        }}
                      >
                        <MessageSquare className="h-4 w-4 mr-1" /> Leave Feedback
                      </Button>
                    ) : (
                      <div className="flex items-center text-sm text-gray-500">
                        <span className="mr-1">Your rating:</span>
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className={`h-4 w-4 ${i < session.rating ? "text-yellow-500 fill-yellow-500" : "text-gray-300"}`} />
                          ))}
                        </div>
                      </div>
                    )}
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Cancel Session Dialog */}
      <Dialog open={cancelDialog} onOpenChange={setCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Session</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>Are you sure you want to cancel your session with {selectedSession?.mentor.name}?</p>
            <p className="mt-2 text-sm text-gray-500">
              Cancellations less than 24 hours before the session may incur a fee.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialog(false)}>
              Keep Session
            </Button>
            <Button variant="destructive" onClick={handleCancelSession}>
              Yes, Cancel Session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Feedback Dialog */}
      <Dialog open={feedbackDialog} onOpenChange={setFeedbackDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Leave Feedback</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <p>How would you rate your session with {selectedSession?.mentor.name}?</p>
              <div className="flex space-x-1">
                {[...Array(5)].map((_, i) => (
                  <button key={i} className="p-1 hover:scale-110 transition-transform">
                    <Star className={`h-6 w-6 ${i < 4 ? "text-yellow-500 fill-yellow-500" : "text-gray-300"}`} />
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium">Comments</label>
              <textarea
                className="w-full p-2 border rounded-md h-24 resize-none"
                placeholder="Share your experience with this mentor..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button className="bg-purple-600 hover:bg-purple-700" onClick={handleProvideFeedback}>
              Submit Feedback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MySessionsTab;
