import React from 'react';
import { Button } from "./ui/button";

const CallToAction = () => {
  return (
    <section className="py-20 px-4">
      <div className="container mx-auto max-w-4xl">
        <div className="animate-fade-in bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-8 md:p-12 text-white text-center shadow-xl">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Start your first focus session today
          </h2>
          <p className="text-indigo-100 mb-8 max-w-xl mx-auto">
            Join thousands of users who have improved their productivity and wellbeing with FocusBuddy.
          </p>
          
          <Button
            size="lg"
            className="cta-button bg-white text-indigo-600 hover:bg-indigo-50 font-medium px-8 py-6 rounded-lg shadow-lg"
          >
            Sign Up Free
          </Button>
          
          <p className="mt-4 text-sm text-indigo-200">
            No credit card required. Cancel anytime.
          </p>
        </div>
      </div>
    </section>
  );
};

export default CallToAction;
