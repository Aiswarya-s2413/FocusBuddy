import React from 'react';
import Navigation from '../../components/Navigation';
import Hero from '../../components/Hero';
import Features from '../../components/Features';
import HowItWorks from '../../components/HowItWorks';
import Testimonials from '../../components/Testimonials';
import Pricing from '../../components/Pricing';
import CallToAction from '../../components/CallToAction';
import Footer from '../../components/Footer';

const Index = () => {
  return (
    <div className="min-h-screen">
      <Navigation />
      <div className="pt-16">
        <Hero />
        <Features />
        <HowItWorks />
        <Testimonials />
        <Pricing />
        <CallToAction />
        <Footer />
      </div>
    </div>
  );
};

export default Index;
