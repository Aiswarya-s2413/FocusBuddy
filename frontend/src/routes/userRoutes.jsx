import { Routes, Route, Navigate } from "react-router-dom";
import Login from "../pages/user/Login";
import Signup from "../pages/user/Signup";
import ForgotPassword from "../pages/user/ForgotPassword";
import Settings from "../pages/user/Settings";
import Home from "../pages/user/Home";
import VerifyOtp from "../pages/user/VerifyOtp";
import SelectSubjects from "../pages/user/SelectSubjects";
import PomodoroTimer from "../pages/user/PomodoroTimer";
import Journal from "../pages/user/Journal";
import { useSelector } from "react-redux";
import AuthLayout from "../components/AuthLayout";
import Mentors from "../pages/user/Mentors";
import FocusBuddy from "../pages/user/FocusBuddy";
import VideoCallPage from "../components/VideoCallPage";
import MySessions from "../pages/user/MySessions";
import SessionHistory from "../pages/user/SessionHistory";

const ProtectedRoute = ({ children }) => {
  const { user } = useSelector((state) => state.user);

  console.log('ProtectedRoute - User:', user);

  if (!user) {
    console.log('Redirecting to /login');
    return <Navigate to="/login" replace />;
  }

  return children;
};

const UserRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/verify-otp" element={<VerifyOtp />} />
      <Route path="/select-subjects" element={<SelectSubjects />} />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <AuthLayout><Settings /></AuthLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/pomodoro"
        element={
          <ProtectedRoute>
            <AuthLayout><PomodoroTimer /></AuthLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/journal"
        element={
          <ProtectedRoute>
            <AuthLayout><Journal /></AuthLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/mentors"
        element={
          <ProtectedRoute>
            <AuthLayout><Mentors /></AuthLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/focus-buddy"
        element={
          <ProtectedRoute>
            <AuthLayout><FocusBuddy /></AuthLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/sessions"
        element={
          <ProtectedRoute>
            <AuthLayout><MySessions /></AuthLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/history"
        element={
          <ProtectedRoute>
            <AuthLayout><SessionHistory /></AuthLayout>
          </ProtectedRoute>
        }
      />
      <Route
          path="/video-call/:sessionId"
          element={
            (() => {
              const user = JSON.parse(localStorage.getItem("user"));
              const mentor = JSON.parse(localStorage.getItem("mentor"));
              const isAuthenticated = user || mentor;

              return isAuthenticated ? (
                <VideoCallPage />
              ) : (
                <Navigate
                  to={window.location.pathname.startsWith("/mentor") ? "/mentor/login" : "/login"}
                  replace
                />
              );
            })()
          }
        />

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

export default UserRoutes; 