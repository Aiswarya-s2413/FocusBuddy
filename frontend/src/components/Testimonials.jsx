import React from 'react';



const Testimonial = ({ quote, name, role, delay }) => {
  return (
    <div className={`animate-scale-in ${delay} bg-white p-6 rounded-lg shadow-sm border border-gray-100`}>
      <div className="mb-4 text-amber-500">
        {[...Array(5)].map((_, i) => (
          <span key={i} className="text-lg">★</span>
        ))}
      </div>
      <p className="text-gray-600 italic mb-4">"{quote}"</p>
      <div>
        <p className="font-semibold">{name}</p>
        <p className="text-sm text-gray-500">{role}</p>
      </div>
    </div>
  );
};

const Testimonials = () => {
  return (
    <section className="py-20 px-4 bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto max-w-6xl">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">What Our Users Say</h2>
        <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">
          Join thousands of users who have improved their focus and wellbeing with FocusBuddy.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <Testimonial
            quote="This helped me avoid burnout during exams. The combination of Pomodoro and mood tracking was exactly what I needed."
            name="Alex K."
            role="Graduate Student"
            delay="[animation-delay:100ms]"
          />
          
          <Testimonial
            quote="I've journaled 40 days straight, thanks FocusBuddy! The simple interface keeps me coming back every day."
            name="Sarah J."
            role="Content Creator"
            delay="[animation-delay:200ms]"
          />
          
          <Testimonial
            quote="As someone with ADHD, this app has been a game-changer for my focus and productivity."
            name="Michael T."
            role="Software Developer"
            delay="[animation-delay:300ms]"
          />
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
