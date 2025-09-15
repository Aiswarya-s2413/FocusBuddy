import React, { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Star, Calendar, Clock, MessageCircle, Video, User, Award, Globe, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Badge } from "../../components/ui/badge";
import { DayPicker } from "react-day-picker";
import { cn } from "../../lib/utils";
import { userAxios } from "../../utils/axios";

// Calendar Component
const CalendarComponent = ({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}) => {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-4", className)}
      classNames={{
        months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
        month: "space-y-4 w-full",
        caption: "flex justify-center pt-1 relative items-center mb-4",
        caption_label: "text-sm font-medium text-gray-900",
        nav: "space-x-1 flex items-center",
        nav_button: cn(
          "h-7 w-7 bg-white border border-gray-300 rounded-md p-0 hover:bg-gray-50 transition-colors flex items-center justify-center"
        ),
        nav_button_previous: "absolute left-1",
        nav_button_next: "absolute right-1",
        table: "w-full border-collapse",
        head_row: "flex mb-2",
        head_cell: "text-gray-500 rounded-md w-9 font-medium text-xs text-center flex items-center justify-center h-9 uppercase",
        row: "flex w-full",
        cell: cn(
          "relative p-0 text-center text-sm",
          "h-9 w-9 m-0.5",
          "focus-within:relative focus-within:z-20"
        ),
        day: cn(
          "h-8 w-8 p-0 font-normal rounded-md transition-colors",
          "hover:bg-purple-50 hover:text-purple-900",
          "focus:bg-purple-100 focus:text-purple-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2",
          "aria-selected:opacity-100"
        ),
        day_range_end: "day-range-end",
        day_selected: "bg-purple-600 text-white hover:bg-purple-700 hover:text-white focus:bg-purple-700 focus:text-white",
        day_today: "bg-gray-100 text-gray-900 font-semibold",
        day_outside: "text-gray-400 opacity-50 aria-selected:bg-purple-100 aria-selected:text-purple-900 aria-selected:opacity-30",
        day_disabled: "text-gray-300 opacity-50 cursor-not-allowed hover:bg-transparent",
        day_range_middle: "aria-selected:bg-purple-100 aria-selected:text-purple-900",
        day_hidden: "invisible",
        ...classNames,
      }}
      components={{
        IconLeft: () => <ChevronLeft className="h-4 w-4" />,
        IconRight: () => <ChevronRight className="h-4 w-4" />,
      }}
      {...props}
    />
  );
};

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

// Component for displaying availability schedule
const AvailabilitySchedule = ({ availability }) => {
  // Define days of the week in order
  const daysOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const dayNames = {
    monday: 'Monday',
    tuesday: 'Tuesday', 
    wednesday: 'Wednesday',
    thursday: 'Thursday',
    friday: 'Friday',
    saturday: 'Saturday',
    sunday: 'Sunday'
  };

  // Function to format time slots
  const formatTimeSlots = (times) => {
    if (!times) return 'Not available';
    if (Array.isArray(times)) return times.join(', ');
    return times;
  };

  // Check if availability data exists
  if (!availability || Object.keys(availability).length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-4 text-center">
        <Clock className="h-8 w-8 text-gray-400 mx-auto mb-2" />
        <p className="text-gray-500">Availability schedule not set</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {daysOrder.map((day) => {
        const times = availability[day.toLowerCase()];
        const isAvailable = times && (Array.isArray(times) ? times.length > 0 : times !== '');
        
        return (
          <div 
            key={day} 
            className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
              isAvailable 
                ? 'bg-green-50 border-green-200' 
                : 'bg-gray-50 border-gray-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${
                isAvailable ? 'bg-green-500' : 'bg-gray-300'
              }`} />
              <span className="font-medium text-gray-900">
                {dayNames[day]}
              </span>
            </div>
            <div className="text-right">
              <span className={`text-sm ${
                isAvailable ? 'text-green-700' : 'text-gray-500'
              }`}>
                {isAvailable ? formatTimeSlots(times) : 'Not available'}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Razorpay payment handler
const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

const MentorProfileModal = ({ mentor, isOpen, onClose, toast }) => {
  const [date, setDate] = useState(new Date());
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [duration, setDuration] = useState("30 mins");
  const [mode, setMode] = useState("Video");
  const [isBooking, setIsBooking] = useState(false);

  // Guard clause to prevent errors if mentor is undefined
  if (!mentor) {
    return null;
  }

  // Function to get day name from date
  const getDayName = (date) => {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[date.getDay()];
  };

  // Get available time slots for the selected date
  const availableTimeSlots = useMemo(() => {
    if (!date || !mentor.availability) {
      return [];
    }

    const dayName = getDayName(date);
    const dayAvailability = mentor.availability[dayName];

    if (!dayAvailability) {
      return [];
    }

    // If dayAvailability is an array, return it directly
    if (Array.isArray(dayAvailability)) {
      return dayAvailability;
    }

    // If it's a string, split by comma and clean up
    if (typeof dayAvailability === 'string') {
      return dayAvailability.split(',').map(time => time.trim()).filter(time => time);
    }

    return [];
  }, [date, mentor.availability]);

  // Reset selected slot when date changes and slots are different
  React.useEffect(() => {
    if (selectedSlot && !availableTimeSlots.includes(selectedSlot)) {
      setSelectedSlot(null);
    }
  }, [availableTimeSlots, selectedSlot]);

  // Helper function to convert duration to minutes
  const getDurationInMinutes = (durationStr) => {
    if (durationStr === "30 mins") return 30;
    if (durationStr === "1 hour") return 60;
    return 30;
  };

  // Helper function to convert mode to backend format
  const getSessionMode = (modeStr) => {
    if (modeStr === "Video") return "video";
    if (modeStr === "Voice") return "voice";
    return "video";
  };

  // Helper function to format time for backend
const formatTimeForBackend = (timeStr) => {
  // Convert "14:30" or "2:30 PM" format to "14:30:00"
  const time24 = timeStr.includes('AM') || timeStr.includes('PM') 
    ? convertTo24Hour(timeStr) 
    : timeStr;
  
  // Ensure seconds are included
  return time24.includes(':') && time24.split(':').length === 2 
    ? `${time24}:00` 
    : time24;
};

// Fixed helper function to convert 12-hour to 24-hour format
const convertTo24Hour = (time12h) => {
  const [time, modifier] = time12h.trim().split(' ');
  let [hours, minutes] = time.split(':');
  
  // Convert hours to integer
  hours = parseInt(hours, 10);
  
  
  if (modifier === 'AM') {
    if (hours === 12) {
      hours = 0; // 12 AM = 00:xx
    }
  } else if (modifier === 'PM') {
    if (hours !== 12) {
      hours = hours + 12; // PM hours except 12 PM
    }
    // 12 PM stays as 12
  }
  
  return `${hours.toString().padStart(2, '0')}:${minutes}`;
};

// Additional helper function to convert 24-hour to 12-hour format (for display)
const convertTo12Hour = (time24h) => {
  const [hours, minutes] = time24h.split(':');
  const hour = parseInt(hours, 10);
  
  if (hour === 0) {
    return `12:${minutes} AM`;
  } else if (hour < 12) {
    return `${hour}:${minutes} AM`;
  } else if (hour === 12) {
    return `12:${minutes} PM`;
  } else {
    return `${hour - 12}:${minutes} PM`;
  }
};

const handleBookSession = async () => {
  console.log('Button clicked')
  if (!selectedSlot || !date || !mentor.is_available || availableTimeSlots.length === 0) {
    toast.error("Please select a valid date and time slot.");
    return;
  }

  setIsBooking(true);

  try {
    // STEP 1: Create Razorpay order via sessions/create-order/
    console.log('Step 1: Creating order...');
    
    const orderData = {
      mentor_id: mentor.id,
      scheduled_date: date.getFullYear() + '-' + 
              String(date.getMonth() + 1).padStart(2, '0') + '-' + 
              String(date.getDate()).padStart(2, '0'),
      scheduled_time: formatTimeForBackend(selectedSlot),
      duration_minutes: getDurationInMinutes(duration),
      session_mode: getSessionMode(mode),
      subjects: mentor.subjects?.map(s => s.id || s) || []
    };

    console.log('Order data:', orderData);
    
    // Enhanced validation logging
    console.log('Validation check:');
    console.log('- mentor_id:', mentor.id, typeof mentor.id);
    console.log('- scheduled_date:', orderData.scheduled_date, 'is valid date?', !isNaN(new Date(orderData.scheduled_date)));
    console.log('- scheduled_time:', orderData.scheduled_time, 'format check');
    console.log('- duration_minutes:', orderData.duration_minutes, typeof orderData.duration_minutes);
    console.log('- session_mode:', orderData.session_mode, typeof orderData.session_mode);
    console.log('- subjects:', orderData.subjects, 'length:', orderData.subjects.length);
    
    // Check if all required fields are present and valid
    if (!orderData.mentor_id || orderData.mentor_id <= 0) {
      throw new Error('Invalid mentor ID');
    }
    
    if (!orderData.scheduled_date || isNaN(new Date(orderData.scheduled_date))) {
      throw new Error('Invalid scheduled date');
    }
    
    if (!orderData.scheduled_time || !/^\d{2}:\d{2}:\d{2}$/.test(orderData.scheduled_time)) {
      throw new Error('Invalid scheduled time format. Expected HH:MM:SS');
    }
    
    if (!orderData.duration_minutes || orderData.duration_minutes <= 0) {
      throw new Error('Invalid duration');
    }
    
    if (!orderData.session_mode || !['video', 'audio', 'chat'].includes(orderData.session_mode)) {
      throw new Error('Invalid session mode');
    }

    const orderResponse = await userAxios.post('sessions/create-order/', orderData);
    
    if (!orderResponse.data.success) {
      throw new Error(orderResponse.data.message || 'Failed to create order');
    }

    console.log('Order created successfully:', orderResponse.data);

    const { order_id, amount, razorpay_key, session_details } = orderResponse.data;

    // STEP 2: Load Razorpay script
    console.log('Step 2: Loading Razorpay script...');
    
    const scriptLoaded = await loadRazorpayScript();
    
    if (!scriptLoaded) {
      throw new Error('Failed to load payment gateway');
    }

    console.log('Razorpay script loaded');

    // STEP 3: Configure and open Razorpay payment
    console.log('Step 3: Opening payment gateway...');
    
    // Store reference to mentor modal before Razorpay opens
    const mentorModalElement = document.querySelector('[role="dialog"]');
    
    const options = {
      key: razorpay_key,
      amount: amount * 100, // Convert to paise
      currency: 'INR',
      name: 'MentorConnect',
      description: `Session with ${session_details.mentor_name}`,
      order_id: order_id,
      handler: async function (response) {
        try {
          const confirmData = {
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_signature: response.razorpay_signature,
            ...orderData // Include all the original order data
          };

          console.log('Confirm data:', confirmData);

          const confirmResponse = await userAxios.post('sessions/confirm-booking/', confirmData);
          
          if (confirmResponse.data.success) {
            console.log('Booking confirmed successfully:', confirmResponse.data);
            
            toast.success("Session Booked Successfully! ");
            
            // Close modal and reset form
            onClose();
            setSelectedSlot(null);
            setDate(new Date());
          } else {
            throw new Error(confirmResponse.data.message || 'Failed to confirm booking');
          }
          
        } catch (confirmError) {
          console.error('Booking confirmation error:', confirmError);
          toast.error("Failed to confirm booking. Please try again.");
        }
      },
      prefill: {
        name: 'Student', // You can get this from user context
        email: 'student@example.com', // You can get this from user context
      },
      theme: {
        color: '#7C3AED' // Purple color to match your theme
      },
      modal: {
        // FIXED: Prevent mentor modal from closing
        backdrop_close: false, // Prevent closing on backdrop click
        escape: false, // Prevent closing on escape key
        ondismiss: function() {
          console.log('Payment cancelled by user');
          setIsBooking(false);
          toast.warning("Payment cancelled. Please try again if you wish to book a session.");
          
          // Restore mentor modal focus and visibility
          setTimeout(() => {
            if (mentorModalElement) {
              mentorModalElement.style.display = '';
              mentorModalElement.style.visibility = '';
              mentorModalElement.focus();
            }
          }, 100);
        }
      }
    };

    // FIXED: Prevent mentor modal from being affected by Razorpay
    if (mentorModalElement) {
      // Increase z-index to ensure it stays above Razorpay when needed
      mentorModalElement.style.zIndex = '9999';
      // Prevent the modal from being hidden
      mentorModalElement.style.position = 'fixed';
    }

    // Open Razorpay checkout
    const razorpay = new window.Razorpay(options);
    razorpay.open();

  } catch (error) {
    console.error('Booking error:', error);
    
    // Enhanced error logging
    if (error.response) {
      console.error('Error response status:', error.response.status);
      console.error('Error response data:', error.response.data);
      console.error('Error response headers:', error.response.headers);
    }
    
    let errorMessage = "An unexpected error occurred. Please try again.";
    
    if (error.response?.data?.errors) {
      // Handle validation errors
      const errors = error.response.data.errors;
      errorMessage = Object.values(errors).flat().join(', ');
      console.error('Validation errors:', errors);
    } else if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    } else if (error.response?.data?.detail) {
      errorMessage = error.response.data.detail;
    } else if (error.message) {
      errorMessage = error.message;
    }

    toast.error(errorMessage);
  } finally {
    setIsBooking(false);
    
    // Reset mentor modal z-index after payment process
    const mentorModalElement = document.querySelector('[role="dialog"]');
    if (mentorModalElement) {
      mentorModalElement.style.zIndex = '';
      mentorModalElement.style.position = '';
    }
  }
};
  // Calculate price based on duration and hourly rate
  const calculatePrice = () => {
    const rate = mentor.hourly_rate || 25;
    const durationHours = getDurationInMinutes(duration) / 60;
    const baseAmount = rate * durationHours;
    const platformFee = baseAmount * 0.10;
    return (baseAmount + platformFee).toFixed(2);
  };

  // Check if a date should be disabled (no availability for that day)
  const isDateDisabled = (date) => {
    if (date < new Date(new Date().setHours(0, 0, 0, 0))) {
      return true; // Disable past dates
    }

    if (!mentor.availability) {
      return true; // No availability data
    }

    const dayName = getDayName(date);
    const dayAvailability = mentor.availability[dayName];
    
    // Check if there are any time slots available for this day
    if (!dayAvailability) return true;
    
    if (Array.isArray(dayAvailability)) {
      return dayAvailability.length === 0;
    }
    
    if (typeof dayAvailability === 'string') {
      return dayAvailability.trim() === '';
    }
    
    return true;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto ">
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

            
          </div>

          <div className="md:col-span-2">
            <Tabs defaultValue="about">
              <TabsList className="grid grid-cols-2 mb-4">
                <TabsTrigger value="about">About</TabsTrigger>
                <TabsTrigger value="booking">Book Session</TabsTrigger>
              </TabsList>
              
              <TabsContent value="about" className="space-y-6">
                <div>
                  <h3 className="font-medium mb-3 text-lg">Bio & Background</h3>
                  <p className="text-gray-600 leading-relaxed">{mentor.bio || 'No bio available'}</p>
                </div>
                
                <div>
                  <h3 className="font-medium mb-3 text-lg">Contact Information</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-gray-700">📧 {mentor.email}</p>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium mb-4 text-lg flex items-center gap-2">
                    <Clock className="h-5 w-5 text-purple-600" />
                    Weekly Availability
                  </h3>
                  <AvailabilitySchedule availability={mentor.availability} />
                </div>
              </TabsContent>
              
              <TabsContent value="booking" className="space-y-6">
                <div className="space-y-4">
                  <h3 className="font-medium text-gray-900">Select Date</h3>
                  <div className="border border-gray-200 rounded-lg bg-white shadow-sm overflow-hidden">
                    <CalendarComponent
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      className="w-full"
                      disabled={isDateDisabled}
                      modifiers={{
                        available: (date) => !isDateDisabled(date)
                      }}
                      modifiersStyles={{
                        available: {
                          backgroundColor: '#f0f9ff',
                          color: '#0369a1'
                        }
                      }}
                    />
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">Select Time Slot</h3>
                    {date && (
                      <span className="text-sm text-gray-500">
                        {date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                      </span>
                    )}
                  </div>
                  
                  {availableTimeSlots.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2">
                      {availableTimeSlots.map((slot) => (
                        <Button
                          key={slot}
                          variant={selectedSlot === slot ? "default" : "outline"}
                          className={selectedSlot === slot ? "bg-purple-600 hover:bg-purple-700" : ""}
                          onClick={() => setSelectedSlot(slot)}
                          disabled={isBooking}
                        >
                          {slot}
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                      <Clock className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500">
                        {date 
                          ? `No time slots available for ${date.toLocaleDateString('en-US', { weekday: 'long' })}`
                          : 'Please select a date to see available time slots'
                        }
                      </p>
                    </div>
                  )}
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
                          disabled={isBooking}
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
                        disabled={isBooking}
                      >
                        <Video className="mr-2 h-4 w-4" /> Video
                      </Button>
                      {/* <Button
                        variant={mode === "Voice" ? "default" : "outline"}
                        className={mode === "Voice" ? "bg-purple-600 hover:bg-purple-700" : ""}
                        onClick={() => setMode("Voice")}
                        disabled={isBooking}
                      >
                        <MessageCircle className="mr-2 h-4 w-4" /> Voice
                      </Button> */}
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
                      <span className="text-gray-600">Total Price :</span>
                      <span className="font-medium">Rs.{calculatePrice()}</span>
                    </div>
                  </div>
                </div>
                
                <Button 
                  className="w-full bg-purple-600 hover:bg-purple-700"
                  disabled={!selectedSlot || !date || !mentor.is_available || availableTimeSlots.length === 0 || isBooking}
                  onClick={handleBookSession}
                >
                  {isBooking ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Calendar className="mr-2 h-4 w-4" />
                      {!mentor.is_available 
                        ? 'Mentor Unavailable' 
                        : availableTimeSlots.length === 0 
                          ? 'No Time Slots Available'
                          : 'Book Session & Pay'
                      }
                    </>
                  )}
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