import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { signupUser } from "../../store/userSlice";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Card, CardHeader, CardContent, CardFooter } from "../../components/ui/card";
import { Mail, Phone, User, Eye, EyeOff } from "lucide-react";
import { Link } from "react-router-dom";
import axios from "axios";

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

  // Add this useEffect to debug navigation
  React.useEffect(() => {
    console.log("Current route location:", window.location.pathname);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <h2 className="text-2xl font-semibold text-center flex items-center justify-center gap-2 text-gray-900">
            <User className="h-6 w-6 text-primary" /> Sign up for FocusBuddy
          </h2>
        </CardHeader>
        <CardContent>
          {/* Success message display */}
          {message && (
            <div className="mb-4 p-3 bg-green-100 border border-green-300 text-green-700 rounded">
              {message}
            </div>
          )}
          
          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            <div className="space-y-2">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">Your Name</label>
              <Input id="name" type="text" placeholder="" required value={formData.name} onChange={handleChange} />
              {formErrors.name && <p className="text-sm text-red-500">{formErrors.name}</p>}
            </div>
            
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 h-5 w-5" />
                <Input id="email" type="email" placeholder="" className="pl-10" required value={formData.email} onChange={handleChange} />
              </div>
              {formErrors.email && <p className="text-sm text-red-500">{formErrors.email}</p>}
            </div>
            
            <div className="space-y-2">
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 h-5 w-5" />
                <Input id="phone" type="tel" placeholder="" className="pl-10" required value={formData.phone} onChange={handleChange} />
              </div>
              {formErrors.phone && <p className="text-sm text-red-500">{formErrors.phone}</p>}
            </div>
            
            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
              <div className="relative">
                <Input 
                  id="password" 
                  type={showPassword ? "text" : "password"} 
                  placeholder="Choose a strong password" 
                  required 
                  value={formData.password} 
                  onChange={handleChange} 
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {formErrors.password && <p className="text-sm text-red-500">{formErrors.password}</p>}
            </div>
            
            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">Confirm Password</label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
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
              {formErrors.confirmPassword && <p className="text-sm text-red-500">{formErrors.confirmPassword}</p>}
            </div>
            
            {/* Display Redux error */}
            {error && (
              <div className="p-3 bg-red-100 border border-red-300 text-red-700 rounded text-sm">
                {typeof error === 'object' ? error.message || Object.values(error)[0] : error}
              </div>
            )}
            
            <Button
              type="submit"
              className="w-full bg-purple-600 hover:bg-purple-700"
              disabled={isLoading}
            >
              {isLoading ? "Signing up..." : "Sign Up"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-gray-600">
            Already have an account?{" "}
            <Link to="/login" className="text-purple-600 hover:underline font-medium">
              Log in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Signup;