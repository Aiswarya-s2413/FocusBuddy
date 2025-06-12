import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Star, Calendar, Clock, MessageCircle, Video, User, Award, Globe } from "lucide-react";
import { Calendar as CalendarComponent } from "../../components/ui/calender";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Badge } from "../../components/ui/badge";
import { useToast } from "../../hooks/use-toast";

const Avatar = ({ children, className = "" }) => (
  <div className={`rounded-full bg-gray-200 flex items-center justify-center ${className}`}>
    {children}
  </div>
);

const AvatarImage = ({ src, alt, className = "" }) => {
  const [imageError, setImageError] = useState(false);
  
  if (!src) return null;

  let fixedSrc = src;
  
  // Handle different URL formats
  if (src.includes('cloudinary.com')) {
    // If it's already a full Cloudinary URL, check if it needs fixing
    if (src.includes('/v1/')) {
      // Replace generic /v1/ with the specific version number and add .jpg extension
      fixedSrc = src.replace('/v1/', '/v1749732168/');
      
      // Add .jpg.jpg extension if it ends with .jpg but not .jpg.jpg
      if (fixedSrc.endsWith('.jpg') && !fixedSrc.endsWith('.jpg.jpg')) {
        fixedSrc = fixedSrc + '.jpg';
      }
    } else {
      // Use the URL as is if it already has a proper version or no version
      fixedSrc = src;
    }
  } else if (src.startsWith('mentors/') || src.includes('/')) {
    // If it's just the path from database, construct the full Cloudinary URL
    // Remove any leading slash and ensure proper format
    const cleanPath = src.startsWith('/') ? src.substring(1) : src;
    
    // For mentor images, add .jpg.jpg as that seems to be the pattern
    let finalPath = cleanPath;
    if (cleanPath.includes('mentors/') && cleanPath.endsWith('.jpg') && !cleanPath.endsWith('.jpg.jpg')) {
      finalPath = `${cleanPath}.jpg`;
    } else if (!cleanPath.includes('.')) {
      finalPath = `${cleanPath}.jpg`;
    }
    
    // Use the specific version number
    fixedSrc = `https://res.cloudinary.com/dnq1fzs1l/image/upload/v1749732168/${finalPath}`;
  }
  
  console.log('Original URL:', src);
  console.log('Fixed URL:', fixedSrc);
  
  // Use a default image if image failed to load
  const defaultImage = "https://via.placeholder.com/150/cccccc/666666?text=No+Image";
  const imageSrc = imageError ? defaultImage : fixedSrc;
  
  return (
    <img 
      src={imageSrc} 
      alt={alt || "Avatar"} 
      className={`w-full h-full object-cover rounded-full ${className}`}
      onError={(e) => {
        console.log('Image failed to load:', e.target.src);
        if (!imageError) {
          setImageError(true);
        }
      }}
    />
  );
};

const AvatarFallback = ({ children, className = "" }) => (
  <div className={`text-gray-600 font-medium ${className}`}>{children}</div>
);


const MentorProfileModal = ({ mentor, isOpen, onClose }) => {
  const { toast } = useToast();
  const [date, setDate] = useState(new Date());
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [duration, setDuration] = useState("30 mins");
  const [mode, setMode] = useState("Video");

  // Guard clause to prevent errors if mentor is undefined
  if (!mentor) {
    return null;
  }

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

  // Calculate price based on duration and hourly rate
  const calculatePrice = () => {
    const rate = mentor.hourly_rate || 25;
    return duration === "30 mins" ? (rate / 2).toFixed(2) : rate.toFixed(2);
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
                <AvatarImage src={mentor.profile_image_url} alt={mentor.name} />
                {/* <AvatarFallback>{mentor.name?.charAt(0) || 'M'}</AvatarFallback> */}
              </Avatar>
              <div>
                <h2 className="text-xl font-semibold">{mentor.name}</h2>
                <p className="text-purple-600">{mentor.expertise_level}</p>
              </div>
              <div className="flex items-center justify-center">
                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 mr-1" />
                <span>{mentor.rating}</span>
                <span className="text-gray-500 ml-1">({mentor.total_sessions} sessions)</span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-gray-500" />
                <span>{mentor.experience || 'Experience not specified'}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-gray-500" />
                <span className="text-gray-600">Rate: Rs.{mentor.hourly_rate}/hour</span>
              </div>
              
              <div className="flex items-center gap-2 text-green-600">
                <Clock className="h-5 w-5" />
                <span>{mentor.is_available ? 'Available Now' : 'Currently Unavailable'}</span>
              </div>
            </div>

            <div>
              <h3 className="font-medium mb-2">Subjects</h3>
              <div className="flex flex-wrap gap-2">
                {mentor.subjects?.map((subject, index) => (
                  <Badge key={subject.id || index} variant="secondary">
                    {subject.name || subject}
                  </Badge>
                )) || <span className="text-gray-500">No subjects specified</span>}
              </div>
            </div>

            {/* <div className="space-y-2">
              <h3 className="font-medium">Stats</h3>
              <div className="text-sm text-gray-600">
                <p>Total Sessions: {mentor.total_sessions}</p>
                <p>Total Students: {mentor.total_students}</p>
                <p>Expertise Level: {mentor.expertise_level}</p>
              </div>
            </div> */}
          </div>

          <div className="md:col-span-2">
            <Tabs defaultValue="about">
              <TabsList className="grid grid-cols-2 mb-4">
                <TabsTrigger value="about">About</TabsTrigger>
                <TabsTrigger value="booking">Book Session</TabsTrigger>
              </TabsList>
              
              <TabsContent value="about" className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">Bio & Background</h3>
                  <p className="text-gray-600">{mentor.bio || 'No bio available'}</p>
                </div>
                
                <div>
                  <h3 className="font-medium mb-2">Contact Information</h3>
                  <p className="text-gray-600">Email: {mentor.email}</p>
                </div>

                <div>
                  <h3 className="font-medium mb-2">Availability</h3>
                  <div className="text-gray-600">
                    {mentor.availability && Object.keys(mentor.availability).length > 0 ? (
                      <div className="space-y-1">
                        {Object.entries(mentor.availability).map(([day, times]) => (
                          <div key={day} className="flex justify-between">
                            <span className="capitalize font-medium">{day}:</span>
                            <span>{Array.isArray(times) ? times.join(', ') : times}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p>Availability schedule not set</p>
                    )}
                  </div>
                </div>
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
                      <span className="font-medium">${calculatePrice()}</span>
                    </div>
                  </div>
                </div>
                
                <Button 
                  className="w-full bg-purple-600 hover:bg-purple-700"
                  disabled={!selectedSlot || !date || !mentor.is_available}
                  onClick={handleBookSession}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  {mentor.is_available ? 'Confirm Booking' : 'Mentor Unavailable'}
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