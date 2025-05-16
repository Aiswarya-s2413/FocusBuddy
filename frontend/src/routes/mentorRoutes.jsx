import { Routes, Route, Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import MentorLogin from "../pages/mentor/MentorLogin";
import MentorSignup from "../pages/mentor/MentorSignup";
import MentorVerifyOtp from "../pages/mentor/MentorVerifyOtp";
import MentorSelectSubjects from "../pages/mentor/MentorSelectSubjects";
import MentorForgotPassword from "../pages/mentor/MentorForgotPassword";
import MentorProfile from "../pages/mentor/MentorProfile";
import MentorProfileUpload from "../pages/mentor/MentorProfileUpload";
import MentorLayout from "../components/mentors/MentorLayout";

// Protected route wrapper
const PrivateRoute = ({ children }) => {
    const user = JSON.parse(localStorage.getItem("user"));
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
            <Route path="/profile" element={<MentorProfile />} />

            {/* Protected Route */}
            <Route
                path="/upload-profile"
                element={
                    <PrivateRoute>
                   <MentorLayout> <MentorProfileUpload /></MentorLayout>
                    </PrivateRoute>
                }
            />
        </Routes>
    );
};

export default MentorRoutes;
