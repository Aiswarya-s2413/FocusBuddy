import React, { useState, useEffect } from "react";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Mail, KeyRound, Eye, EyeOff } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardHeader, CardContent, CardFooter } from "../../components/ui/card";
import axios from "axios";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: New Password
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [passwordsMatch, setPasswordsMatch] = useState(true);
  const [passwordError, setPasswordError] = useState("");
  const [timeLeft, setTimeLeft] = useState(60); // 60 seconds timer
  const [canResend, setCanResend] = useState(false);

  // Helper function to extract error message from API response
  const getErrorMessage = (error) => {
    if (!error.response) {
      return "Network error. Please check your connection and try again.";
    }

    const errorData = error.response.data;
    
    // Handle field-specific errors (like email validation errors)
    if (errorData.email && Array.isArray(errorData.email)) {
      return errorData.email[0];
    }
    
    // Handle general error field
    if (errorData.error) {
      return errorData.error;
    }
    
    // Handle non_field_errors
    if (errorData.non_field_errors && Array.isArray(errorData.non_field_errors)) {
      return errorData.non_field_errors[0];
    }
    
    // Handle detail field (common in DRF)
    if (errorData.detail) {
      return errorData.detail;
    }
    
    // Handle message field
    if (errorData.message) {
      return errorData.message;
    }
    
    // Default fallback
    return "An error occurred. Please try again.";
  };

  // Timer effect
  useEffect(() => {
    let timer;
    if (step === 2 && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [step, timeLeft]);

  // Reset timer when moving to OTP step
  useEffect(() => {
    if (step === 2) {
      setTimeLeft(60);
      setCanResend(false);
    }
  }, [step]);

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage("");
    
    try {
      const response = await axios.post("http://localhost:8000/api/user/forgot-password/", { email });
      if (response.status === 200) {
        setMessage("OTP has been sent to your email");
        setStep(2);
      }
    } catch (err) {
      console.log('Send OTP Error:', err.response?.data); // Debug log
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage("");
    
    try {
      const response = await axios.post("http://localhost:8000/api/user/verify-forgot-password-otp/", {
        email,
        otp,
      });
      if (response.status === 200) {
        setMessage("OTP verified successfully");
        setStep(3);
      }
    } catch (err) {
      console.log('Verify OTP Error:', err.response?.data); // Debug log
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const isOnlySymbolsOrSpaces = (str) => /^[^a-zA-Z0-9]*$/.test(str) || /^\s*$/.test(str);

  const handlePasswordChange = (e) => {
    const value = e.target.value;
    setNewPassword(value);
    if (confirmPassword) {
      setPasswordsMatch(value === confirmPassword);
    }
    if (value.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
    } else if (isOnlySymbolsOrSpaces(value)) {
      setPasswordError("Password cannot be only symbols or spaces.");
    } else {
      setPasswordError("");
    }
  };

  const handleConfirmPasswordChange = (e) => {
    const value = e.target.value;
    setConfirmPassword(value);
    if (newPassword) {
      setPasswordsMatch(value === newPassword);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!passwordsMatch || passwordError) {
      return;
    }
    setLoading(true);
    setError(null);
    setMessage("");
    
    try {
      const response = await axios.post("http://localhost:8000/api/user/reset-password/", {
        email,
        otp,
        new_password: newPassword,
      });
      if (response.status === 200) {
        setMessage("Password reset successfully");
        navigate("/login");
      }
    } catch (err) {
      console.log('Reset Password Error:', err.response?.data); // Debug log
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setLoading(true);
    setError(null);
    setMessage("");
    
    try {
      const response = await axios.post("http://localhost:8000/api/user/forgot-password/", { email });
      if (response.status === 200) {
        setMessage("New OTP has been sent to your email");
        setTimeLeft(60);
        setCanResend(false);
      }
    } catch (err) {
      console.log('Resend OTP Error:', err.response?.data); // Debug log
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <h2 className="text-2xl font-semibold text-center flex items-center justify-center gap-2 text-gray-900">
            <KeyRound className="h-6 w-6 text-primary" /> Reset Password
          </h2>
        </CardHeader>
        <CardContent>
          {step === 1 && (
            <form className="space-y-4" onSubmit={handleSendOTP}>
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
              <Button
                type="submit"
                className="w-full bg-purple-600 hover:bg-purple-700"
                disabled={loading}
              >
                {loading ? "Sending OTP..." : "Send OTP"}
              </Button>
            </form>
          )}

          {step === 2 && (
            <form className="space-y-4" onSubmit={handleVerifyOTP}>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700" htmlFor="otp">
                  Enter OTP
                </label>
                <Input
                  id="otp"
                  type="text"
                  placeholder="Enter 6-digit OTP"
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                />
                <div className="flex justify-between items-center mt-2">
                  <p className="text-sm text-gray-600">
                    Time remaining: {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                  </p>
                  {canResend && (
                    <button
                      type="button"
                      onClick={handleResendOTP}
                      className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                      disabled={loading}
                    >
                      Resend OTP
                    </button>
                  )}
                </div>
              </div>
              <Button
                type="submit"
                className="w-full bg-purple-600 hover:bg-purple-700"
                disabled={loading}
              >
                {loading ? "Verifying..." : "Verify OTP"}
              </Button>
            </form>
          )}

          {step === 3 && (
            <form className="space-y-4" onSubmit={handleResetPassword}>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700" htmlFor="newPassword">
                  New Password
                </label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter new password"
                    required
                    value={newPassword}
                    onChange={handlePasswordChange}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {passwordError && <p className="text-sm text-red-500">{passwordError}</p>}
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700" htmlFor="confirmPassword">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm new password"
                    required
                    value={confirmPassword}
                    onChange={handleConfirmPasswordChange}
                    className={!passwordsMatch ? "border-red-500" : ""}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {!passwordsMatch && <p className="text-sm text-red-500">Passwords do not match</p>}
              </div>
              <Button
                type="submit"
                className="w-full bg-purple-600 hover:bg-purple-700"
                disabled={loading || !passwordsMatch || !!passwordError}
              >
                {loading ? "Resetting Password..." : "Reset Password"}
              </Button>
            </form>
          )}

          {error && (
            <div className="text-red-500 text-sm mt-2 p-2 bg-red-50 rounded border border-red-200">
              {error}
            </div>
          )}
          {message && (
            <div className="text-green-600 text-sm mt-2 p-2 bg-green-50 rounded border border-green-200">
              {message}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-gray-600">
            Remember your password?{" "}
            <Link to="/login" className="text-purple-600 hover:underline font-medium">
              Log in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default ForgotPassword;