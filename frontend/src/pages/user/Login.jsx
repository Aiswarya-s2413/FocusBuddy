import React, { useState, useEffect } from "react";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Mail, KeyRound, Eye, EyeOff } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardHeader, CardContent, CardFooter } from "../../components/ui/card";
import { useDispatch, useSelector } from "react-redux";
import { loginUser } from "../../store/userSlice"; 
import { clearMessage } from "../../store/userSlice";

const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Redux states for loading, error, and success messages
  const { loading, error, message } = useSelector((state) => state.user);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

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
      navigate("/settings");
      dispatch(clearMessage()); 
    }
  }, [message, error, navigate, dispatch]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <h2 className="text-2xl font-semibold text-center flex items-center justify-center gap-2 text-gray-900">
            <KeyRound className="h-6 w-6 text-primary" /> Login to FocusBuddy
          </h2>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700" htmlFor="email">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 h-5 w-5" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@email.com"
                  className="pl-10"
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
                  placeholder="••••••••"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-sm text-purple-600 hover:underline">
                Forgot Password?
              </Link>
            </div>
            <Button
              type="submit"
              className="w-full bg-purple-600 hover:bg-purple-700"
              disabled={loading}
            >
              {loading ? "Logging in..." : "Log In"}
            </Button>
            {error && (
              <div className="text-red-500 text-sm mt-2">
                {getErrorMessage(error)}
              </div>
            )}
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-gray-600">
            Don't have an account?{" "}
            <Link to="/signup" className="text-purple-600 hover:underline font-medium">
              Sign up
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Login;
