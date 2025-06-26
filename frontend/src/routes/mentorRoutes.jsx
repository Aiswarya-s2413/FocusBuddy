import { Routes, Route, Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import MentorLogin from "../pages/mentor/MentorLogin";
import MentorSignup from "../pages/mentor/MentorSignup";
import MentorVerifyOtp from "../pages/mentor/MentorVerifyOtp";
import MentorSelectSubjects from "../pages/mentor/MentorSelectSubjects";
import MentorForgotPassword from "../pages/mentor/MentorForgotPassword";
import MentorProfileUpload from "../pages/mentor/MentorProfileUpload";
import MentorLayout from "../components/mentors/MentorLayout";
import MentorProfileDisplay from "../pages/mentor/MentorProfileDisplay";
import VideoCallPage from "../components/VideoCallPage";

// Protected route wrapper
const PrivateRoute = ({ children }) => {
    const user = JSON.parse(localStorage.getItem("mentor"));
    const isAuthenticated = !!user;
  
    return isAuthenticated ? children : <Navigate to="/mentor/login" replace />;
  };
  
const MentorRoutes = () => {
    return (
        <Routes>
            <Route path="/login" element={<MentorLogin />} />
            <Route path="/signup" element={<MentorSignup />} />
            <Route path="/verify-otp" element={<MentorVerifyOtp />} />
            <Route path="/select-subjects" element={<MentorSelectSubjects />} />
            <Route path="/forgot-password" element={<MentorForgotPassword />} />

            {/* Protected Route */}
            <Route
                path="/upload-profile"
                element={
                    <PrivateRoute>
                   <MentorLayout> <MentorProfileUpload /></MentorLayout>
                    </PrivateRoute>
                }
            />
            <Route
                path="/profile-display"
                element={
                    <PrivateRoute>
                   <MentorLayout> <MentorProfileDisplay /></MentorLayout>
                    </PrivateRoute>
                }
            />
            <Route path="/video-call/:sessionId" element={<PrivateRoute><VideoCallPage /></PrivateRoute>} />
        </Routes>
    );
};

export default MentorRoutes;
