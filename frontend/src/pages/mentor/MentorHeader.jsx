import { useEffect } from "react";
import { toast } from "../../components/ui/toast";

function useMentorNotifications(onNotification) {
  useEffect(() => {
    const ws = new WebSocket("ws://localhost:8000/ws/mentor/notifications/");
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      onNotification(data);
    };
    return () => ws.close();
  }, [onNotification]);
}

const MentorHeader = (props) => {
  useMentorNotifications((data) => {
    if (data.event === "session_booked") {
      toast.success(
        `New session booked by ${data.student_name} on ${data.scheduled_date} at ${data.scheduled_time}`
      );
    } else if (data.event === "session_cancelled") {
      toast.info(
        `Session cancelled by ${data.student_name} on ${data.scheduled_date} at ${data.scheduled_time}`
      );
    } else {
      toast(
        `Notification: ${data.event} for session ${data.session_id}`
      );
    }
  });
  // ... existing code ...
}; 