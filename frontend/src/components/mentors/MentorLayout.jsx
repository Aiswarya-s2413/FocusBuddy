import React from 'react';
import PropTypes from 'prop-types';
import MentorNavbar from './MentorNavbar';

const MentorLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-[#F8F6FB]">
      <MentorNavbar />
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
};

MentorLayout.propTypes = {
  children: PropTypes.node.isRequired,
};

export default MentorLayout;
