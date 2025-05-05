import React from 'react';
import { Check } from "lucide-react";



const Step = ({ number, title, description, delay }) => {
  return (
    <div className={`animate-slide-in ${delay} flex items-start gap-5`}>
      <div className="flex-shrink-0">
        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
          {number}
        </div>
      </div>
      <div>
        <h3 className="text-xl font-semibold mb-2">{title}</h3>
        <p className="text-gray-600">{description}</p>
      </div>
    </div>
  );
};

const HowItWorks = () => {
  return (
    <section className="py-20 px-4 bg-focusbuddy-gray/50">
      <div className="container mx-auto max-w-4xl">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">How It Works</h2>
        <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">
          Start improving your focus and wellbeing in just three simple steps.
        </p>
        
        <div className="grid grid-cols-1 gap-10 md:gap-12">
          <Step
            number={1}
            title="Create your free account"
            description="Sign up in seconds with just your email. No credit card required to get started with all core features."
            delay="[animation-delay:100ms]"
          />
          
          <div className="hidden md:block border-l-2 border-dashed border-indigo-200 h-8 ml-5"></div>
          
          <Step
            number={2}
            title="Start a focus session with one click"
            description="Choose a preset timer or customize your own. Our intuitive interface makes it easy to get started right away."
            delay="[animation-delay:300ms]"
          />
          
          <div className="hidden md:block border-l-2 border-dashed border-indigo-200 h-8 ml-5"></div>
          
          <Step
            number={3}
            title="Track mood, write journal, and grow"
            description="After each focus session, log your mood and reflections. Over time, gain insights into your productivity patterns."
            delay="[animation-delay:500ms]"
          />
        </div>
        
        <div className="mt-16 bg-white p-6 rounded-lg shadow-sm border border-gray-100">
          <h4 className="text-lg font-semibold mb-3 flex items-center">
            <Check className="mr-2 h-5 w-5 text-green-500" />
            What makes FocusBuddy different
          </h4>
          <p className="text-gray-600">
            Unlike other productivity tools, FocusBuddy combines time management with mental wellness tracking, 
            giving you a holistic view of your productivity journey. Our minimal design ensures you stay focused 
            on what matters most.
          </p>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
