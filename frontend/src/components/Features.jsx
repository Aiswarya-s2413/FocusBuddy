import React from 'react';
import { Clock, Smile, BookOpen, BarChart2, Heart } from "lucide-react";

const FeatureCard = ({ icon, title, description, color }) => {
  return (
    <div className={`feature-card bg-white rounded-xl p-6 shadow-md transition-all duration-300 border border-gray-100 ${color}`}>
      <div className={`inline-flex items-center justify-center w-12 h-12 rounded-lg mb-4`}>
        {icon}
      </div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
};

const Features = () => {
  return (
    <section id="features" className="py-20 px-4 bg-gradient-to-b from-white to-gray-50">
      <div className="container mx-auto max-w-6xl">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">Core Features</h2>
        <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">
          Everything you need to boost productivity and maintain mental wellness in one simple tool.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="animate-slide-in [animation-delay:100ms]">
            <FeatureCard
              icon={<Clock className="w-6 h-6 text-indigo-500" />}
              title="Pomodoro Timer"
              description="Stay focused with customizable work sessions and breaks using our elegant Pomodoro timer."
              color="hover:bg-focusbuddy-blue/20"
            />
          </div>
          
          <div className="animate-slide-in [animation-delay:200ms]">
            <FeatureCard
              icon={<Smile className="w-6 h-6 text-amber-500" />}
              title="Mood Logging"
              description="Track your emotional wellbeing throughout the day with our simple mood tracking system."
              color="hover:bg-focusbuddy-peach/20"
            />
          </div>
          
          <div className="animate-slide-in [animation-delay:300ms]">
            <FeatureCard
              icon={<BookOpen className="w-6 h-6 text-emerald-500" />}
              title="Daily Journaling"
              description="Reflect on your day with guided journaling prompts designed to foster mindfulness."
              color="hover:bg-focusbuddy-green/20"
            />
          </div>
          
          <div className="animate-slide-in [animation-delay:400ms]">
            <FeatureCard
              icon={<BarChart2 className="w-6 h-6 text-blue-500" />}
              title="Simple Analytics"
              description="Gain insights into your focus habits and mood patterns with beautiful, minimalist charts."
              color="hover:bg-focusbuddy-blue/20"
            />
          </div>
          
          <div className="animate-slide-in [animation-delay:500ms]">
            <FeatureCard
              icon={<Heart className="w-6 h-6 text-rose-500" />}
              title="Mentoring"
              description="Access and connect with mentors through pre-scheduled meetings."
              color="hover:bg-focusbuddy-pink/20"
            />
          </div>
          
          <div className="animate-slide-in [animation-delay:600ms]">
            <FeatureCard
              icon={
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-green-400"></div>
                  <div className="w-2 h-2 rounded-full bg-amber-400"></div>
                  <div className="w-2 h-2 rounded-full bg-rose-400"></div>
                </div>
              }
              title="Distraction Free"
              description="Minimize distractions with our clean, minimal interface designed for maximum focus."
              color="hover:bg-focusbuddy-purple/20"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Features;
