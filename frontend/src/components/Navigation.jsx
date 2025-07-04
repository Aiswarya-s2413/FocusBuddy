import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Menu, X } from 'lucide-react';
import { Link } from 'react-router-dom';

const Navigation = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      isScrolled ? 'bg-white shadow-sm py-3' : 'bg-transparent py-5'
    }`}>
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <a href="/" className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-600">
              FocusBuddy
            </a>
          </div>

          <div className="hidden md:flex items-center space-x-8">
            <nav className="flex items-center space-x-6">
              <Link to="/journal" className="text-gray-600 hover:text-gray-900">Journal</Link>
              <a href="#features" className="text-gray-600 hover:text-gray-900" onClick={e => { e.preventDefault(); document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' }); }}>Features</a>
              <a href="#" className="text-gray-600 hover:text-gray-900" onClick={e => { e.preventDefault(); document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' }); }}>How It Works</a>
              
            </nav>

            <div className="flex items-center space-x-3">
              <Link to="/login">
                <Button variant="outline" className="border-[#9b87f5] text-[#9b87f5] hover:bg-[#F8F6FB]">
                  Log In
                </Button>
              </Link>
              <Link to="/signup">
                <Button className="bg-[#9b87f5] hover:bg-[#7E69AB] text-white font-semibold shadow-md">
                  Sign Up
                </Button>
              </Link>
            </div>
          </div>

          <div className="md:hidden">
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2">
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {isMobileMenuOpen && (
          <div className="md:hidden mt-4 py-4 border-t border-gray-100 animate-fade-in bg-white rounded-lg shadow-lg">
            <nav className="flex flex-col space-y-4">
              <Link to="/journal" className="text-gray-600 hover:text-gray-900 py-2">Journal</Link>
              <a href="#features" className="text-gray-600 hover:text-gray-900 py-2" onClick={e => { e.preventDefault(); setIsMobileMenuOpen(false); setTimeout(() => { document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' }); }, 100); }}>Features</a>
              <a href="#" className="text-gray-600 hover:text-gray-900 py-2" onClick={e => { e.preventDefault(); setIsMobileMenuOpen(false); setTimeout(() => { document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' }); }, 100); }}>How It Works</a>
              <a href="#" className="text-gray-600 hover:text-gray-900 py-2">Pricing</a>
            </nav>
            <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col space-y-3">
              <Link to="/login">
                <Button variant="outline" className="border-[#9b87f5] text-[#9b87f5] w-full hover:bg-[#F8F6FB]">
                  Log In
                </Button>
              </Link>
              <Link to="/signup">
                <Button className="bg-[#9b87f5] hover:bg-[#7E69AB] text-white w-full font-semibold shadow-md">
                  Sign Up
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navigation;
