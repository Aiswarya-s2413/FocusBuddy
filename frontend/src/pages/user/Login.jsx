import React, { useState, useEffect } from "react";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Mail, KeyRound, Eye, EyeOff, CheckCircle, Target, Users, PenTool, BookOpen, TrendingUp, Calendar, Award } from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Card, CardHeader, CardContent, CardFooter } from "../../components/ui/card";
import { useDispatch, useSelector } from "react-redux";
import { loginUser, clearMessage, hydrateUserFromLocalStorage } from "../../store/userSlice";
import GoogleAuthButton from '../../components/ui/GoogleAuthButton';
import { useSimpleToast } from '../../components/ui/toast';

const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast, ToastContainer } = useSimpleToast();

  // Redux states for loading, error, and success messages
  const { loading, error, message } = useSelector((state) => state.user);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  

useEffect(() => {
  // Check if user is already logged in
  const user = localStorage.getItem('user');
  const role = localStorage.getItem('role');
  
  if (user && role) {
    // User is already logged in, redirect to focus session
    navigate("/focus-buddy", { replace: true });
  }
}, [navigate]);
  // Check for signup success from navigation state
  useEffect(() => {
    if (location.state?.signupSuccess) {
      setShowSuccessToast(true);
      // Hide toast after 5 seconds
      const timer = setTimeout(() => {
        setShowSuccessToast(false);
      }, 5000);
      
      // Clear the state to prevent showing toast on refresh
      window.history.replaceState({}, document.title);
      
      return () => clearTimeout(timer);
    }
  }, [location.state]);

  const getErrorMessage = (error) => {
    if (!error) return "";
    
    console.log('Error response:', error); // Debug log
    
    // Handle different error cases
    if (error.non_field_errors && Array.isArray(error.non_field_errors)) {
      const errorMessage = error.non_field_errors[0];
      if (errorMessage.toLowerCase().includes('invalid credentials') || 
          errorMessage.toLowerCase().includes('unverified user')) {
        return "Incorrect email or password. Please try again.";
      }
      return errorMessage;
    }
    
    // Handle error object
    if (error.error) {
      if (typeof error.error === 'string') {
        if (error.error.toLowerCase().includes('invalid credentials') || 
            error.error.toLowerCase().includes('unverified user')) {
          return "Incorrect email or password. Please try again.";
        }
        if (error.error.toLowerCase().includes('user is blocked')) {
          return "Your account has been blocked by admin. Please contact support for assistance.";
        }
        return error.error;
      }
    }
    
    // Handle message field
    if (error.message) {
      return error.message;
    }
    
    // Handle detail field (common in DRF)
    if (error.detail) {
      return error.detail;
    }
    
    return "An error occurred. Please try again.";
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    dispatch(loginUser({ email, password }));
  };

  useEffect(() => {
    if (message && !error) {
      localStorage.setItem('role', 'user');
      localStorage.setItem('user', JSON.stringify(JSON.parse(localStorage.getItem('user')) || response.data.user));

      navigate("/focus-buddy");
      dispatch(clearMessage()); 
    }
  }, [message, error, navigate, dispatch]);

  // Google login handler
  const handleGoogleSuccess = (data) => {
    if (data && data.user) {
      localStorage.setItem('role', 'user');
      localStorage.setItem('user', JSON.stringify(data.user));
      dispatch(hydrateUserFromLocalStorage()); // <-- Hydrate Redux from localStorage
      navigate('/focus-buddy');
    } else {
      toast.error('Google login failed. Please try again.');
    }
  };
  const handleGoogleError = (err) => {
    toast.error(typeof err === 'string' ? err : 'Google login failed.');
  };

  return (
    <div className="min-h-screen flex">
      {/* Success Toast */}
      {showSuccessToast && (
        <div className="fixed top-4 right-4 z-50 bg-green-50 border border-green-200 rounded-lg p-4 shadow-lg max-w-sm animate-in slide-in-from-right-full">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-green-800">Signup Successful!</p>
              <p className="text-xs text-green-700 mt-1">
                {location.state?.message || "Please login to continue."}
              </p>
            </div>
            <button
              onClick={() => setShowSuccessToast(false)}
              className="ml-auto text-green-600 hover:text-green-800"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Left Side - Welcome Back Content with Background Image */}
      <div 
        className="hidden lg:flex lg:w-1/2 p-12 flex-col justify-center relative overflow-hidden"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1522202176988-66273c2fd55f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        {/* Background overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/80 via-purple-800/85 to-indigo-900/80"></div>
        <div className="absolute top-20 left-20 w-32 h-32 bg-white/10 rounded-full blur-xl"></div>
        <div className="absolute bottom-20 right-20 w-40 h-40 bg-white/5 rounded-full blur-2xl"></div>
        
        <div className="relative z-10 text-white flex flex-col items-center justify-center h-full">
          {/* Logo/Brand */}
          <div className="mb-8 text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm">
                <Target className="h-8 w-8 text-white" />
              </div>
              <h1 className="text-4xl font-bold">Welcome Back!</h1>
            </div>
            <p className="text-xl text-purple-100 font-medium">Ready to continue your growth journey?</p>
          </div>

          {/* Floating elements */}
          <div className="mb-8 relative">
            <div className="flex items-center justify-center gap-6 mb-6">
              <div className="bg-white/20 backdrop-blur-sm rounded-full p-4">
                <BookOpen className="h-8 w-8 text-white" />
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-full p-4">
                <TrendingUp className="h-8 w-8 text-white" />
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-full p-4">
                <Users className="h-8 w-8 text-white" />
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-full p-4">
                <PenTool className="h-8 w-8 text-white" />
              </div>
            </div>
          </div>

          {/* Motivational Quote */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 text-center max-w-md mb-8">
            <div className="flex items-center justify-center gap-3 mb-3">
              <Award className="h-6 w-6 text-yellow-300" />
              <span className="text-lg font-semibold">Daily Motivation</span>
            </div>
            <p className="text-purple-100 italic">
              "The journey of a thousand miles begins with a single step. Welcome back to your path of growth!"
            </p>
          </div>

          {/* I am a mentor button */}
          <div className="w-full max-w-md">
            <Button
              type="button"
              className="w-full h-12 bg-white/20 hover:bg-white/30 text-white font-medium border border-white/30 backdrop-blur-sm transition-all duration-200 hover:shadow-lg"
              onClick={() => navigate("/mentor/login")}
            >
              I am a mentor
            </Button>
          </div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center px-4 py-8 bg-gray-50">
      <div className="absolute top-4 left-4 md:left-8">
+          <Link to="/" className="text-sm text-purple-600 hover:text-purple-700 font-medium hover:underline">Back to Home</Link>
+        </div>
        <Card className="w-full max-w-md shadow-xl border-0">
          <CardHeader className="text-center pb-6">
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className="lg:hidden bg-purple-600 p-2 rounded-xl">
                <KeyRound className="h-6 w-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">
                <span className="lg:hidden">FocusBuddy - </span>Welcome Back
              </h2>
            </div>
            <p className="text-gray-600 text-sm">Continue your journey to personal excellence</p>
          </CardHeader>
          
          <CardContent className="px-6">
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700" htmlFor="email">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email address"
                    className="pl-10 h-11 border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700" htmlFor="password">
                  Password
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    className="pr-10 h-11 border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              
              <div className="flex justify-end">
                <Link to="/forgot-password" className="text-sm text-purple-600 hover:text-purple-700 font-medium hover:underline">
                  Forgot Password?
                </Link>
              </div>
              
              <Button
                type="submit"
                className="w-full h-11 bg-purple-600 hover:bg-purple-700 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-200"
                disabled={loading}
              >
                {loading ? "Logging in..." : "Continue Journey"}
              </Button>
              
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                  {getErrorMessage(error)}
                </div>
              )}
            </form>
            {/* Divider and Google Auth Button */}
            <div className="flex items-center my-6">
              <div className="flex-grow h-px bg-gray-200" />
              <span className="mx-3 text-gray-400 text-xs">or</span>
              <div className="flex-grow h-px bg-gray-200" />
            </div>
            <GoogleAuthButton onSuccess={handleGoogleSuccess} onError={handleGoogleError} buttonText="Continue with Google" />
          </CardContent>
          
          <CardFooter className="flex justify-center pt-4">
            <p className="text-sm text-gray-600">
              Don't have an account?{" "}
              <Link to="/signup" className="text-purple-600 hover:text-purple-700 font-medium hover:underline">
                Start Your Journey
              </Link>
            </p>
          </CardFooter>
        </Card>
        <ToastContainer />
      </div>
    </div>
  );
};

export default Login;