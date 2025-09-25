import React from 'react';
import { Button } from "./ui/button";
import { ArrowRight } from "lucide-react";
import { useNavigate } from 'react-router-dom';

const Hero = () => {
  const navigate = useNavigate();
  const handleScroll = () => {
    const featuresSection = document.getElementById('features');
    featuresSection?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleClick = () => {
    navigate('/signup');
  };

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center py-20 overflow-hidden bg-white dark:bg-gray-950">
      
      {/* Background - A more complex, animated background for visual interest */}
      <div className="absolute inset-0 z-0 opacity-10">
        <div className="absolute top-[-10%] left-[-10%] w-64 h-64 bg-focusbuddy-blue rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob"></div>
        <div className="absolute top-[50%] left-[50%] w-80 h-80 bg-focusbuddy-green rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-72 h-72 bg-focusbuddy-purple rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-4000"></div>
      </div>
      
      {/* Hero Content - Centered and visually appealing */}
      <div className="container mx-auto max-w-4xl relative z-10 px-4">
        <div className="text-center animate-fade-in-up">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-6 text-gray-900 dark:text-white leading-tight">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-focusbuddy-blue to-focusbuddy-purple">Boost Focus,</span> Track Moods, Reflect Daily
          </h1>
          
          <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto font-light animate-fade-in-up animation-delay-500">
            A minimalist Pomodoro & self-awareness tool to help you build better habits.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up animation-delay-1000">
            <Button 
              onClick={handleClick}
              size="lg"
              className="cta-button bg-gradient-to-r from-focusbuddy-blue to-focusbuddy-purple hover:from-focusbuddy-purple hover:to-focusbuddy-blue text-white font-semibold px-8 py-6 rounded-lg shadow-xl transform transition-transform duration-300 hover:-translate-y-1"
            >
              Start Focusing
            </Button>
            
            <Button 
              onClick={handleScroll}
              variant="outline" 
              size="lg"
              className="cta-button bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-semibold px-8 py-6 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm transform transition-transform duration-300 hover:-translate-y-1 hover:shadow-md"
            >
              See How It Works <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Animated Timer Mockup */}
        <div className="mt-24 flex justify-center animate-scale-in animation-delay-1500">
          <div className="relative w-64 h-64 md:w-72 md:h-72">
            <div className="absolute inset-0 bg-white dark:bg-gray-800 rounded-full shadow-2xl flex items-center justify-center transform transition-transform duration-500 hover:scale-105">
              <div className="w-[80%] h-[80%] rounded-full border-8 border-focusbuddy-green border-opacity-50 flex items-center justify-center relative">
                <div className="w-full h-full rounded-full absolute animate-ping-slow bg-focusbuddy-green opacity-20"></div>
                <div className="w-[65%] h-[65%] rounded-full bg-white dark:bg-gray-900 shadow-inner flex items-center justify-center text-4xl font-extralight text-gray-500 dark:text-gray-300 transform transition-transform duration-300 hover:scale-105">
                  25:00
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;