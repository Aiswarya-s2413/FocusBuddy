import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { signupUser, hydrateUserFromLocalStorage } from "../../store/userSlice";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Card, CardHeader, CardContent, CardFooter } from "../../components/ui/card";
import { Mail, Phone, User, Eye, EyeOff, BookOpen, Users, PenTool, Target, Star, Trophy, Brain, Heart, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import axios from "axios";
import GoogleAuthButton from '../../components/ui/GoogleAuthButton';
import { useSimpleToast } from '../../components/ui/toast';

const initialErrors = {
  name: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: ""
};

const Signup = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { toast, ToastContainer } = useSimpleToast();

  const { error } = useSelector((state) => state.user);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const [formErrors, setFormErrors] = useState(initialErrors);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordsMatch, setPasswordsMatch] = useState(true);
  const [isContinuingSignup, setIsContinuingSignup] = useState(false);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Validation helpers
  const isOnlySymbolsOrSpaces = (str) => /^[^a-zA-Z0-9]*$/.test(str) || /^\s*$/.test(str);
  const isValidEmail = (email) => /@gmail\.com$/.test(email);
  const isValidPhone = (phone) => /^\d{10}$/.test(phone);

  const validateField = (id, value) => {
    let error = "";
    if (!value || value.trim() === "") {
      error = "This field is required.";
    } else if (isOnlySymbolsOrSpaces(value)) {
      error = "Cannot be only symbols or spaces.";
    } else {
      switch (id) {
        case "name":
          if (value.trim().length < 4) error = "Name must be at least 4 letters.";
          break;
        case "email":
          if (!isValidEmail(value)) error = "Email must be a valid @gmail.com address.";
          break;
        case "phone":
          if (!isValidPhone(value)) error = "Phone must be exactly 10 digits.";
          break;
        case "password":
          if (value.length < 6) error = "Password must be at least 6 characters.";
          break;
        case "confirmPassword":
          if (value !== formData.password) error = "Passwords do not match.";
          break;
        default:
          break;
      }
    }
    return error;
  };

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));

    // Validate on change
    setFormErrors((prev) => ({ ...prev, [id]: validateField(id, value) }));

    if (id === "password" || id === "confirmPassword") {
      const password = id === "password" ? value : formData.password;
      const confirm = id === "confirmPassword" ? value : formData.confirmPassword;
      setPasswordsMatch(password === confirm || confirm === "");
      setFormErrors((prev) => ({
        ...prev,
        confirmPassword: confirm && password !== confirm ? "Passwords do not match." : ""
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Clear any existing errors
    dispatch({ type: 'user/setError', payload: null });
    setMessage("");

    console.log("=== SIGNUP SUBMISSION STARTED ===");
    console.log("Form data:", {
      name: formData.name,
      email: formData.email,
      phone: formData.phone
    });

    // Validate all fields before submission
    let hasErrors = false;
    const newErrors = {};
    Object.keys(formData).forEach(key => {
      const error = validateField(key, formData[key]);
      if (error) {
        newErrors[key] = error;
        hasErrors = true;
      }
    });
    
    if (hasErrors) {
      console.log("=== VALIDATION ERRORS FOUND ===", newErrors);
      setFormErrors(newErrors);
      setIsLoading(false);
      return;
    }

    try {
      console.log("=== MAKING API CALL ===");
      
      const signupResponse = await axios.post("http://localhost:8000/api/user/signup/", {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
      });
      
      console.log("=== API RESPONSE RECEIVED ===");
      console.log("Status:", signupResponse.status);
      console.log("Data:", signupResponse.data);
      
      // Check for successful response (200 or 201)
      if (signupResponse.status === 200 || signupResponse.status === 201) {
        console.log("=== SIGNUP SUCCESSFUL ===");
        
        // Set success message
        setMessage(signupResponse.data.message || "Signup successful!");
        
        // Store email for OTP verification
        localStorage.setItem("email", formData.email);
        console.log("Email stored in localStorage:", formData.email);
        
        // Navigate to OTP verification page
        console.log("=== ATTEMPTING NAVIGATION ===");
        navigate("/verify-otp");
        console.log("=== NAVIGATION CALLED ===");
        
      } else {
        console.log("=== UNEXPECTED STATUS CODE ===", signupResponse.status);
        throw new Error(`Unexpected response status: ${signupResponse.status}`);
      }
      
    } catch (err) {
      console.log("=== ERROR OCCURRED ===");
      console.log("Error object:", err);
      console.log("Response status:", err.response?.status);
      console.log("Response data:", err.response?.data);
      console.log("Response headers:", err.response?.headers);
      
      // Handle different types of errors
      if (err.response) {
        // Server responded with error status
        const status = err.response.status;
        const data = err.response.data;
        
        if (status === 400 && data?.email) {
          // Handle email-specific validation errors
          const emailError = Array.isArray(data.email) ? data.email[0] : data.email;
          console.log("Email validation error:", emailError);
          setFormErrors(prev => ({ ...prev, email: emailError }));
          dispatch({ type: 'user/setError', payload: emailError });
        } else if (data?.error) {
          // Handle general error messages
          console.log("General error:", data.error);
          dispatch({ type: 'user/setError', payload: data.error });
        } else if (data?.detail) {
          // Handle detail error messages
          console.log("Detail error:", data.detail);
          dispatch({ type: 'user/setError', payload: data.detail });
        } else if (typeof data === 'string') {
          // Handle string error responses
          console.log("String error response:", data);
          dispatch({ type: 'user/setError', payload: data });
        } else {
          // Handle other response errors
          console.log("Other response error");
          dispatch({ type: 'user/setError', payload: `Server error: ${status}` });
        }
      } else if (err.request) {
        // Network error
        console.log("Network error:", err.request);
        dispatch({ type: 'user/setError', payload: "Network error. Please check your connection." });
      } else {
        // Other errors
        console.log("Other error:", err.message);
        dispatch({ type: 'user/setError', payload: err.message || "An unexpected error occurred" });
      }
    } finally {
      console.log("=== CLEANUP ===");
      setIsLoading(false);
    }
  };

  // Google signup handler
  const handleGoogleSuccess = (data) => {
    if (data && data.user) {
      localStorage.setItem('role', 'user');
      localStorage.setItem('user', JSON.stringify(data.user));
      dispatch(hydrateUserFromLocalStorage()); // <-- Hydrate Redux from localStorage
      navigate('/focus-buddy');
    } else {
      toast.error('Google signup failed. Please try again.');
    }
  };
  const handleGoogleError = (err) => {
    toast.error(typeof err === 'string' ? err : 'Google signup failed.');
  };

  

  // useEffect to debug navigation
  React.useEffect(() => {
    console.log("Current route location:", window.location.pathname);
  }, []);

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Welcome Content */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-purple-600 via-purple-700 to-purple-800 relative overflow-hidden">
        {/* Background Image with Shadow Effect */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-50"
          style={{
            backgroundImage: "url('https://images.unsplash.com/photo-1522202176988-66273c2fd55f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1471&q=80')",
            filter: "blur(0.5px)"
          }}
        />
        
        {/* Dark overlay for better text readability */}
        <div className="absolute inset-0 bg-black bg-opacity-20" />

        {/* Background decorative elements */}
        <div className="absolute top-20 left-20 w-32 h-32 bg-white bg-opacity-10 rounded-full blur-xl" />
        <div className="absolute top-40 right-16 w-24 h-24 bg-white bg-opacity-10 rounded-full blur-xl" />
        <div className="absolute bottom-32 left-16 w-40 h-40 bg-white bg-opacity-10 rounded-full blur-xl" />
        <div className="absolute bottom-20 right-20 w-28 h-28 bg-white bg-opacity-10 rounded-full blur-xl" />

        <div className="relative z-10 flex flex-col justify-center items-start p-12 text-white">
          {/* Logo/Brand */}
          <div className="mb-12">
            <div className="flex items-center space-x-3 mb-4">
              <div className="flex items-center justify-center w-12 h-12 bg-white bg-opacity-20 rounded-xl backdrop-blur-sm">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">FocusBuddy</h1>
              </div>
            </div>
            <p className="text-purple-100 text-lg font-medium">Your Partner in Self-Development</p>
          </div>

          {/* Features */}
          <div className="space-y-8 mb-12">
            <div className="flex items-start space-x-4">
              <div className="flex items-center justify-center w-12 h-12 bg-white bg-opacity-20 rounded-xl backdrop-blur-sm">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Meet Expert Mentors</h3>
                <p className="text-purple-100">Connect with experienced mentors who guide you through your personal growth journey.</p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex items-center justify-center w-12 h-12 bg-white bg-opacity-20 rounded-xl backdrop-blur-sm">
                <PenTool className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Personal Journals</h3>
                <p className="text-purple-100">Track your progress, reflect on your experiences, and celebrate your achievements.</p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex items-center justify-center w-12 h-12 bg-white bg-opacity-20 rounded-xl backdrop-blur-sm">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Combine Study</h3>
                <p className="text-purple-100">Join study groups, share resources, and learn together with like-minded individuals.</p>
              </div>
            </div>
          </div>

          {/* Be a Mentor CTA */}
          <div className="mb-8 w-full">
            <div className="bg-white bg-opacity-15 backdrop-blur-sm rounded-2xl p-6 border border-white border-opacity-20">
              <div className="flex items-center space-x-4 mb-4">
                <div className="flex items-center justify-center w-10 h-10 bg-white bg-opacity-20 rounded-xl">
                  <Star className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Ready to Share Your Expertise?</h3>
                  <p className="text-purple-100 text-sm">Help others grow while building your mentoring career</p>
                </div>
              </div>
              <Link 
                to="/mentor/signup" 
                className="inline-flex items-center justify-center w-full bg-white bg-opacity-20 hover:bg-opacity-30 text-white font-medium py-3 px-4 rounded-xl transition-all duration-200 backdrop-blur-sm border border-white border-opacity-20 hover:border-opacity-40 group"
              >
                <span>Be a Mentor</span>
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>

         
        </div>
      </div>

      {/* Right Side - Signup Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center space-x-2 mb-4">
              
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Create Account</h2>
              </div>
            </div>
            <p className="text-gray-600">Join thousands of learners on their growth journey</p>
          </CardHeader>
          <CardContent>
            {/* Success message display */}
            {message && (
              <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
                {message}
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={handleChange}
                    className="pl-10"
                    placeholder="Enter your full name"
                  />
                </div>
                {formErrors.name && <p className="text-red-500 text-sm mt-1">{formErrors.name}</p>}
              </div>
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="pl-10"
                    placeholder="Enter your email"
                  />
                </div>
                {formErrors.email && <p className="text-red-500 text-sm mt-1">{formErrors.email}</p>}
              </div>
              
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    className="pl-10"
                    placeholder="Enter your phone number"
                  />
                </div>
                {formErrors.phone && <p className="text-red-500 text-sm mt-1">{formErrors.phone}</p>}
              </div>
              
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={handleChange}
                    className="pr-10"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {formErrors.password && <p className="text-red-500 text-sm mt-1">{formErrors.password}</p>}
              </div>
              
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="pr-10"
                    placeholder="Confirm your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {formErrors.confirmPassword && <p className="text-red-500 text-sm mt-1">{formErrors.confirmPassword}</p>}
              </div>
              
              {/* Display Redux error */}
              {error && (
                <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                  {typeof error === 'object' ? error.message || Object.values(error)[0] : error}
                </div>
              )}
              
              <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700" disabled={isLoading}>
                {isLoading ? "Creating Account..." : "Create Account"}
              </Button>
            </form>
            {/* Divider and Google Auth Button */}
            <div className="flex items-center my-6">
              <div className="flex-grow h-px bg-gray-200" />
              <span className="mx-3 text-gray-400 text-xs">or</span>
              <div className="flex-grow h-px bg-gray-200" />
            </div>
            <GoogleAuthButton onSuccess={handleGoogleSuccess} onError={handleGoogleError} buttonText="Sign up with Google" />
          </CardContent>
          <CardFooter>
            <p className="text-center text-sm text-gray-600 w-full">
              Already have an account?{" "}
              <Link to="/login" className="text-purple-600 hover:text-purple-500 font-medium">
                Sign in
              </Link>
            </p>
          </CardFooter>
        </Card>
        <ToastContainer />
      </div>
    </div>
  );
};

export default Signup;