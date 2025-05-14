import { Routes, Route, Navigate } from "react-router-dom";
import Login from "../pages/user/Login";
import Signup from "../pages/user/Signup";
import ForgotPassword from "../pages/user/ForgotPassword";
import Settings from "../pages/user/Settings";
import Home from "../pages/user/Home";
import VerifyOtp from "../pages/user/VerifyOtp";
import SelectSubjects from "../pages/user/SelectSubjects";
import PomodoroTimer from "../pages/user/PomodoroTimer";
import { useSelector } from "react-redux";
import AuthLayout from "../components/AuthLayout";

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
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

export default UserRoutes; 