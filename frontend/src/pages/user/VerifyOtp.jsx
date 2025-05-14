import React, { useState, useEffect } from "react";
import { Button } from "../../components/ui/button";
import { useNavigate } from "react-router-dom";
import { Card, CardHeader, CardContent, CardFooter } from "../../components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "../../components/ui/input-otp";
import axios from "axios";

const VerifyOTP = () => {
  const navigate = useNavigate();
  const [otp, setOtp] = useState("");
  const [error, setError] = useState(null);
  const [timer, setTimer] = useState(60); // 60 seconds
  const [canResend, setCanResend] = useState(false);

  // Get email from localStorage
  const email = localStorage.getItem("email");

  // Redirect if no email is found
  useEffect(() => {
    if (!email) {
      navigate('/signup');
    }
  }, [email, navigate]);

  useEffect(() => {
    if (timer > 0) {
      const countdown = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(countdown);
    } else {
      setCanResend(true);
    }
  }, [timer]);

  const handleVerify = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const response = await axios.post("http://localhost:8000/api/user/verify-otp/", {
        email,
        otp,
      });

      if (response.status === 200) {
        navigate("/select-subjects");
      }
    } catch (err) {
      setError(err.response?.data?.error || "Verification failed");
    }
  };

  const handleResend = async () => {
    try {
      await axios.post("http://localhost:8000/api/user/resend-otp/", { email });
      setTimer(60);
      setCanResend(false);
      setError(null);
    } catch (err) {
      setError("Failed to resend OTP. Try again.");
    }
  };

  if (!email) {
    return null; // Don't render anything while redirecting
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <h2 className="text-2xl font-semibold text-center text-gray-900">
            Verify Your Email
          </h2>
          <p className="text-center text-gray-600 mt-2">
            We've sent a 6-digit verification code to {email}
          </p>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={handleVerify}>
            <div className="flex flex-col items-center justify-center space-y-4">
              <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                <InputOTPGroup>
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <InputOTPSlot key={i} index={i} />
                  ))}
                </InputOTPGroup>
              </InputOTP>
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
            {canResend ? "Didn't receive a code?" : `Resend available in ${timer}s`}
          </p>
          <Button 
            variant="link" 
            className="text-purple-600" 
            onClick={handleResend} 
            disabled={!canResend}
          >
            Resend Code
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default VerifyOTP;
