import React, { useState, useEffect } from "react";
import { Button } from "../../components/ui/button";
import { useNavigate } from "react-router-dom";
import { Card, CardHeader, CardContent, CardFooter } from "../../components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "../../components/ui/input-otp";
import { Clock, RefreshCw } from "lucide-react";
import axios from "axios";

const MentorVerifyOtp = () => {
  const navigate = useNavigate();
  const [otp, setOtp] = useState("");
  const [error, setError] = useState(null);
  const [timeLeft, setTimeLeft] = useState(60); // 60 seconds timer
  const [canResend, setCanResend] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const email = localStorage.getItem("email");

  // Timer effect
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => {
        setTimeLeft(timeLeft - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [timeLeft]);

  // Format time as MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      const response = await axios.post("https://api.focusbuddy.aiswaryasathyan.space/api/mentor/verify-otp/", {
        email,
        otp,
      });

      if (response.status === 200) {
        navigate("/mentor/select-subjects");
      }
    } catch (err) {
      setError(err.response?.data?.error || "Verification failed");
    }
  };

  const handleResendOtp = async () => {
    if (!canResend) return;

    setIsResending(true);
    setError(null);

    try {
      // Assuming you have a resend OTP endpoint
      const response = await axios.post("https://api.focusbuddy.aiswaryasathyan.space/api/mentor/resend-otp/", {
        email,
      });

      if (response.status === 200) {
        // Reset timer
        setTimeLeft(60);
        setCanResend(false);
        setOtp(""); // Clear current OTP input
        
        // You might want to show a success message
        setError(null);
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to resend OTP");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <h2 className="text-2xl font-semibold text-center text-gray-900">
            Verify Your Email
          </h2>
          <p className="text-center text-gray-600 mt-2">
            We've sent a 6-digit verification code to your email
          </p>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={handleVerify}>
            <div className="flex flex-col items-center justify-center space-y-4">
              <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>

              {/* Timer Display */}
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="h-4 w-4" />
                <span>
                  {timeLeft > 0 ? (
                    <>Code expires in {formatTime(timeLeft)}</>
                  ) : (
                    <span className="text-red-500">Code expired</span>
                  )}
                </span>
              </div>
            </div>

            {error && <p className="text-red-500 text-center">{error}</p>}

            <Button 
              type="submit" 
              className="w-full bg-purple-600 hover:bg-purple-700"
              disabled={otp.length !== 6}
            >
              Verify & Continue
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col justify-center space-y-2">
          <p className="text-sm text-gray-600 text-center">
            Didn't receive a code?
          </p>
          <Button 
            variant="link" 
            className={`text-purple-600 ${!canResend ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={handleResendOtp}
            disabled={!canResend || isResending}
          >
            {isResending ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : canResend ? (
              "Resend Code"
            ) : (
              `Resend in ${formatTime(timeLeft)}`
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default MentorVerifyOtp;