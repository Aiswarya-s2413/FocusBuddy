import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
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

const MentorSignup = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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

  // Validation helpers
  const isOnlySymbolsOrSpaces = (str) => /^[^a-zA-Z0-9]*$/.test(str) || /^\s*$/.test(str);
  const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);;
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
          if (!isValidEmail(value)) error = "Enter a valid email address";
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
    setError(null);

    let errors = {};
    let hasError = false;
    // Validate all fields
    Object.keys(formData).forEach((key) => {
      const err = validateField(key, formData[key]);
      errors[key] = err;
      if (err) hasError = true;
    });
    setFormErrors(errors);
    if (hasError) return;

    const { name, email, phone, password } = formData;
    setLoading(true);

    try {
      const response = await axios.post("http://localhost:8000/api/mentor/signup/", {
        name,
        email,
        phone,
        password,
      });

      if (response.status === 201) {
        // Store email in localStorage for OTP verification
        localStorage.setItem("email", email);
        navigate("/mentor/verify-otp");
      }
    } catch (err) {
      console.error("Signup error:", err.response?.data);
      if (err.response?.data) {
        // Handle validation errors
        const errorData = err.response.data;
        if (typeof errorData === 'object') {
          // If error is an object with field-specific errors
          const errorMessages = Object.entries(errorData)
            .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages[0] : messages}`)
            .join(', ');
          setError(errorMessages);
        } else {
          // If error is a simple string message
          setError(errorData);
        }
      } else {
        setError("Signup failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <h2 className="text-2xl font-semibold text-center flex items-center justify-center gap-2 text-gray-900">
            <User className="h-6 w-6 text-primary" /> Sign up as Mentor
          </h2>
        </CardHeader>
        <CardContent>
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
              {error && (
                <p className="text-sm text-red-500">
                  {typeof error === 'object' ? error.message || Object.values(error)[0] : error}
                </p>
              )}
            </div>
            <Button
              type="submit"
              className="w-full bg-purple-600 hover:bg-purple-700"
              disabled={loading}
            >
              {loading ? "Signing up..." : "Sign Up"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-gray-600">
            Already have an account?{" "}
            <Link to="/mentor/login" className="text-purple-600 hover:underline font-medium">
              Log in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
};

export default MentorSignup;
