import React, { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { userAxios } from '../../utils/axios';

const GoogleAuthButton = ({ onSuccess, onError, buttonText = "Continue with Google" }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleAuth = async (credentialResponse) => {
    setIsLoading(true);
    try {
      // Send the Google token to your Django backend using userAxios
      const response = await userAxios.post('auth/google/', {
        token: credentialResponse.credential  // Same as your original code
      });
      if (response && response.data) {
        onSuccess(response.data);
      } else {
        onError('Google authentication failed');
      }
    } catch (error) {
      console.error('Google auth error:', error);
      if (error.response && error.response.data && error.response.data.error) {
        onError(error.response.data.error);
      } else {
        onError('Google authentication failed');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleError = (error) => {
    console.error('Google sign-in error:', error);
    onError('Google sign-in was cancelled or failed');
  };

  return (
    <div className="w-full google-auth-container">
      <GoogleLogin
        onSuccess={handleGoogleAuth}
        onError={handleGoogleError}
        useOneTap={false}
        text="signin_with"
        shape="rectangular"
        theme="outline"
        size="large"
        logo_alignment="left"
        width="100%"
      />
      
      {isLoading && (
        <div className="flex justify-center items-center mt-2">
          <div className="text-sm text-gray-600">Authenticating...</div>
        </div>
      )}

      {/* CSS to make it match your form styling */}
      <style jsx global>{`
        .google-auth-container > div {
          width: 100% !important;
        }
        
        .google-auth-container iframe {
          width: 100% !important;
          height: 44px !important;
        }
        
        .google-auth-container [role="button"] {
          width: 100% !important;
          height: 44px !important;
          border-radius: 6px !important;
          border: 1px solid #d1d5db !important;
          font-weight: 500 !important;
        }
      `}</style>
    </div>
  );
};

export default GoogleAuthButton;