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
    <section className="hero-background min-h-[90vh] flex items-center justify-center px-4 py-20 relative overflow-hidden">
      <div className="absolute inset-0 z-0 opacity-20">
        <div className="absolute top-[20%] left-[20%] w-32 h-32 bg-focusbuddy-blue rounded-full blur-3xl"></div>
        <div className="absolute top-[60%] right-[20%] w-40 h-40 bg-focusbuddy-green rounded-full blur-3xl"></div>
        <div className="absolute bottom-[10%] left-[40%] w-36 h-36 bg-focusbuddy-purple rounded-full blur-3xl"></div>
      </div>
      
      <div className="container mx-auto max-w-4xl relative z-10">
        <div className="text-center animate-fade-in">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-gray-800 to-gray-600">
            Boost Focus, Track Moods, Reflect Daily
          </h1>
          
          <p className="text-lg md:text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            A minimalist Pomodoro & self-awareness tool to help you build better habits.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              onClick={handleClick}
              size="lg"
              className="cta-button bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-medium px-8 py-6 rounded-lg shadow-lg"
            >
              Start Focusing
            </Button>
            
            <Button 
              onClick={handleScroll}
              variant="outline" 
              size="lg"
              className="cta-button bg-white text-gray-700 font-medium px-8 py-6 rounded-lg border border-gray-200 shadow-sm"
            >
              See How It Works <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
        
        <div className="mt-16 flex justify-center animate-scale-in opacity-80">
          <div className="relative w-64 h-64 md:w-72 md:h-72">
            <div className="absolute inset-0 bg-white rounded-full shadow-lg flex items-center justify-center">
              <div className="w-[80%] h-[80%] rounded-full border-8 border-focusbuddy-green border-opacity-50 flex items-center justify-center">
                <div className="w-[65%] h-[65%] rounded-full bg-white shadow-inner flex items-center justify-center text-3xl font-light text-gray-500">
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
