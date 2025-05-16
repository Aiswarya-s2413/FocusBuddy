import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "../../components/ui/button";
import { Star, Calendar, Clock, MessageCircle, Video, User, Award, Globe } from "lucide-react";
import { Calendar as CalendarComponent } from "../../components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Badge } from "../../components/ui/badge";
import { useToast } from "../../hooks/use-toast";

const MentorProfileModal = ({ mentor, isOpen, onClose }) => {
  const { toast } = useToast();
  const [date, setDate] = useState(new Date());
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [duration, setDuration] = useState("30 mins");
  const [mode, setMode] = useState("Video");

  const timeSlots = [
    "9:00 AM", "10:00 AM", "11:00 AM", 
    "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM"
  ];

  const handleBookSession = () => {
    toast({
      title: "Session Booked",
      description: `You've booked a ${duration} ${mode} session with ${mentor.name} on ${date?.toDateString()} at ${selectedSlot}.`,
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Mentor Profile</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          <div className="md:col-span-1 space-y-6">
            <div className="flex flex-col items-center text-center space-y-3">
              <Avatar className="h-24 w-24 border-2 border-purple-100">
                <AvatarImage src={mentor.profilePicture} alt={mentor.name} />
                <AvatarFallback>{mentor.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-xl font-semibold">{mentor.name}</h2>
                <p className="text-purple-600">{mentor.specialization}</p>
              </div>
              <div className="flex items-center justify-center">
                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 mr-1" />
                <span>{mentor.rating}</span>
                <span className="text-gray-500 ml-1">({mentor.reviewCount} reviews)</span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-gray-500" />
                <span>{mentor.experience}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-gray-500" />
                <div className="flex flex-wrap gap-1">
                  {mentor.languages.map((lang) => (
                    <Badge key={lang} variant="outline" className="bg-purple-50">
                      {lang}
                    </Badge>
                  ))}
                </div>
              </div>
              
              <div className="flex items-center gap-2 text-green-600">
                <Clock className="h-5 w-5" />
                <span>Next available: {mentor.nextAvailable}</span>
              </div>
            </div>

            <div>
              <h3 className="font-medium mb-2">Expertise</h3>
              <div className="flex flex-wrap gap-2">
                {mentor.expertise.map((skill) => (
                  <Badge key={skill} variant="secondary">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <div className="md:col-span-2">
            <Tabs defaultValue="about">
              <TabsList className="grid grid-cols-3 mb-4">
                <TabsTrigger value="about">About</TabsTrigger>
                <TabsTrigger value="reviews">Reviews</TabsTrigger>
                <TabsTrigger value="booking">Book Session</TabsTrigger>
              </TabsList>
              
              <TabsContent value="about" className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">Bio & Background</h3>
                  <p className="text-gray-600">{mentor.bio}</p>
                </div>
                
                <div>
                  <h3 className="font-medium mb-2">Past Session Topics</h3>
                  <ul className="list-disc pl-5 text-gray-600 space-y-1">
                    {mentor.pastSessionTopics.map((topic, index) => (
                      <li key={index}>{topic}</li>
                    ))}
                  </ul>
                </div>
              </TabsContent>
              
              <TabsContent value="reviews" className="space-y-4">
                {mentor.reviews.map((review, index) => (
                  <div key={index} className="p-3 rounded-lg border">
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-500" />
                        <span className="font-medium">{review.user}</span>
                      </div>
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${i < review.rating ? "text-yellow-500 fill-yellow-500" : "text-gray-300"}`}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-gray-600 text-sm">{review.comment}</p>
                    <p className="text-xs text-gray-400 mt-1">{review.date}</p>
                  </div>
                ))}
              </TabsContent>
              
              <TabsContent value="booking" className="space-y-6">
                <div className="space-y-2">
                  <h3 className="font-medium">Select Date</h3>
                  <div className="border rounded-md p-3 bg-white shadow-sm">
                    <CalendarComponent
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      className="rounded-md pointer-events-auto"
                      disabled={(date) => {
                        return date < new Date(new Date().setHours(0, 0, 0, 0));
                      }}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h3 className="font-medium">Select Time Slot</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {timeSlots.map((slot) => (
                      <Button
                        key={slot}
                        variant={selectedSlot === slot ? "default" : "outline"}
                        className={selectedSlot === slot ? "bg-purple-600 hover:bg-purple-700" : ""}
                        onClick={() => setSelectedSlot(slot)}
                      >
                        {slot}
                      </Button>
                    ))}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h3 className="font-medium">Duration</h3>
                    <div className="flex space-x-2">
                      {["30 mins", "1 hour"].map((option) => (
                        <Button
                          key={option}
                          variant={duration === option ? "default" : "outline"}
                          className={duration === option ? "bg-purple-600 hover:bg-purple-700" : ""}
                          onClick={() => setDuration(option)}
                        >
                          {option}
                        </Button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="font-medium">Session Mode</h3>
                    <div className="flex space-x-2">
                      <Button
                        variant={mode === "Video" ? "default" : "outline"}
                        className={mode === "Video" ? "bg-purple-600 hover:bg-purple-700" : ""}
                        onClick={() => setMode("Video")}
                      >
                        <Video className="mr-2 h-4 w-4" /> Video
                      </Button>
                      <Button
                        variant={mode === "Voice" ? "default" : "outline"}
                        className={mode === "Voice" ? "bg-purple-600 hover:bg-purple-700" : ""}
                        onClick={() => setMode("Voice")}
                      >
                        <MessageCircle className="mr-2 h-4 w-4" /> Voice
                      </Button>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h3 className="font-medium">Session Details</h3>
                  <div className="border rounded-md p-3 bg-gray-50">
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-600">Session Type:</span>
                      <span>{mode} ({duration})</span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span className="text-gray-600">Date & Time:</span>
                      <span>
                        {date?.toLocaleDateString()} {selectedSlot || "No time selected"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Estimated Price:</span>
                      <span className="font-medium">{duration === "30 mins" ? "$25" : "$45"}</span>
                    </div>
                  </div>
                </div>
                
                <Button 
                  className="w-full bg-purple-600 hover:bg-purple-700"
                  disabled={!selectedSlot || !date}
                  onClick={handleBookSession}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  Confirm Booking
                </Button>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MentorProfileModal;
