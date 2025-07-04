import React, { useState, useEffect } from "react";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Mail, KeyRound, Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardHeader, CardContent } from "../../components/ui/card";
import { useDispatch, useSelector } from "react-redux";
import { adminLogin, clearError, clearMessage } from "../../store/adminSlice";

const AdminLogin = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Get admin state from Redux
  const { loading, error, message, isAuthenticated, admin } = useSelector(
    (state) => state.admin
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Clear any existing errors or messages when component mounts
  useEffect(() => {
    dispatch(clearError());
    dispatch(clearMessage());
  }, [dispatch]);

  // If admin is already authenticated, redirect to /admin/users
  useEffect(() => {
    if (isAuthenticated && admin) {
      navigate('/admin/dashboard');
    }
  }, [isAuthenticated, admin, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Clear any existing errors
    dispatch(clearError());

    // Dispatch the admin login action
    const result = await dispatch(adminLogin({ email, password }));
    
    // If login is successful, navigate to users page
    if (!result.error) {
      navigate("/admin/dashboard", { replace: true });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <h2 className="text-2xl font-semibold text-center flex items-center justify-center gap-2 text-gray-900">
            <KeyRound className="h-6 w-6 text-primary" /> Admin Login
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
                  placeholder="admin@email.com"
                  className="pl-10"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
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
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  disabled={loading}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
            <Button
              type="submit"
              className="w-full bg-purple-600 hover:bg-purple-700"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Logging in...
                </span>
              ) : (
                "Log In"
              )}
            </Button>
            {error && (
              <div className="text-red-500 text-sm mt-2 text-center">
                {typeof error === 'string' ? error : error.message || "An error occurred. Please try again."}
              </div>
            )}
            {message && !error && (
              <div className="text-green-500 text-sm mt-2 text-center">
                {message}
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminLogin;