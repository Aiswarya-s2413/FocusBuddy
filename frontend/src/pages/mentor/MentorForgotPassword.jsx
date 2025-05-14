import React, { useState } from "react";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Mail, KeyRound, Eye, EyeOff } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardHeader, CardContent, CardFooter } from "../../components/ui/card";
import axios from "axios";

const MentorForgotPassword = () => {
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

  const handleSendOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post("http://localhost:8000/api/mentor/forgot-password/", { email });
      if (response.status === 200) {
        setMessage("OTP has been sent to your email");
        setStep(2);
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post("http://localhost:8000/api/mentor/verify-forgot-password-otp/", {
        email,
        otp,
      });
      if (response.status === 200) {
        setMessage("OTP verified successfully");
        setStep(3);
      }
    } catch (err) {
      setError(err.response?.data?.error || "Invalid OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = (e) => {
    const value = e.target.value;
    setNewPassword(value);
    if (confirmPassword) {
      setPasswordsMatch(value === confirmPassword);
    }
    if (value.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
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
    try {
      const response = await axios.post("http://localhost:8000/api/mentor/reset-password/", {
        email,
        otp,
        new_password: newPassword,
      });
      if (response.status === 200) {
        setMessage("Password reset successfully");
        navigate("/mentor/login");
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to reset password. Please try again.");
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
                {!passwordsMatch && (
                  <p className="text-sm text-red-500">Passwords do not match</p>
                )}
              </div>
              <Button
                type="submit"
                className="w-full bg-purple-600 hover:bg-purple-700"
                disabled={loading || !passwordsMatch || !!passwordError}
              >
                {loading ? "Resetting..." : "Reset Password"}
              </Button>
            </form>
          )}

          {error && <p className="text-red-500 text-center mt-4">{error}</p>}
          {message && <p className="text-green-500 text-center mt-4">{message}</p>}
        </CardContent>
        <CardFooter className="flex justify-center">
          <Link to="/mentor/login" className="text-sm text-purple-600 hover:underline">
            Back to Login
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
};

export default MentorForgotPassword; 