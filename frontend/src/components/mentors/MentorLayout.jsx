import React from 'react';
import PropTypes from 'prop-types';
import MentorNavbar from './MentorNavbar';
import { useEffect } from 'react';
import { useSimpleToast } from '../ui/toast';

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
}

const MentorLayout = ({ children }) => {
  const { toast, ToastContainer } = useSimpleToast();
  useEffect(() => {
    const token = getCookie('mentor_access') || getCookie('access');
    const wsUrl = token
      ? `ws://localhost:8000/ws/mentor/notifications/?token=${token}`
      : 'ws://localhost:8000/ws/mentor/notifications/';
    const ws = new WebSocket(wsUrl);
    ws.onopen = () => {
      console.log('Mentor notification WebSocket connected');
    };
    ws.onmessage = (event) => {
      console.log("[WebSocket] Received message:", event.data);
      const data = JSON.parse(event.data);
      if (data.event === 'session_booked') {
        toast.success(`New session booked by ${data.student_name} on ${data.scheduled_date} at ${data.scheduled_time}`);
      } else if (data.event === 'session_cancelled') {
        toast.info(`Session cancelled by ${data.student_name} on ${data.scheduled_date} at ${data.scheduled_time}`);
      } else {
        toast(`Notification: ${data.event} for session ${data.session_id}`);
      }
    };
    ws.onerror = (e) => {
      console.error('Mentor notification WebSocket error', e);
    };
    ws.onclose = () => {
      console.log('Mentor notification WebSocket closed');
    };
    return () => ws.close();
  }, [toast]);
  return (
    <div className="min-h-screen bg-[#F8F6FB]">
      <ToastContainer />
      <MentorNavbar />
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
};

MentorLayout.propTypes = {
  children: PropTypes.node.isRequired,
};

export default MentorLayout;
