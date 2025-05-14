import React from 'react';
import AuthNavbar from './AuthNavbar';

const AuthLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-[#F8F6FB]">
      <AuthNavbar />
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
};

export default AuthLayout;
