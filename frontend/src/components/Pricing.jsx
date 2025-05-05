import React from 'react';
import { Check } from "lucide-react";

const Pricing = () => {
  return (
    <section className="py-20 px-4 bg-focusbuddy-blue/10">
      <div className="container mx-auto max-w-4xl">
        <div className="animate-fade-in bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
          <div className="p-8 md:p-12">
            <div className="inline-block px-4 py-1 rounded-full bg-indigo-100 text-indigo-700 font-medium text-sm mb-4">
              Simple Pricing
            </div>
            
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              FocusBuddy is completely free.
            </h2>
            <p className="text-gray-600 mb-8 max-w-2xl">
              We believe everyone should have access to tools that improve focus and wellbeing.
              Premium features coming soon.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div>
                <h3 className="text-lg font-semibold mb-4">Included in free plan:</h3>
                <ul className="space-y-3">
                  {[
                    'Unlimited Pomodoro sessions',
                    'Daily mood tracking',
                    'Basic journaling',
                    'Simple analytics',
                    'Web access on all devices'
                  ].map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-600">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-4">Coming soon in premium:</h3>
                <ul className="space-y-3">
                  {[
                    'Advanced analytics & insights',
                    'Custom focus music',
                    'Team collaboration',
                    'API integrations',
                    'Priority support'
                  ].map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <div className="h-5 w-5 rounded-full border border-dashed border-gray-300 mr-2 flex-shrink-0 mt-0.5"></div>
                      <span className="text-gray-400">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Pricing;