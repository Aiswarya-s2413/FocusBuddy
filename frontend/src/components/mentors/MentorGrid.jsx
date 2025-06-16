import React from "react";
import { useState } from "react";
import PropTypes from "prop-types";
import { Star, Clock } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardFooter } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";

const Avatar = ({ children, className = "" }) => (
  <div className={`rounded-full bg-gray-200 flex items-center justify-center ${className}`}>
    {children}
  </div>
);

const AvatarImage = ({ src, alt, className = "" }) => {
  const [imageError, setImageError] = useState(false);
  
  if (!src) return null;

  let fixedSrc = src;
  
  // Handle different URL formats
  if (src.includes('cloudinary.com')) {
    // If it's already a full Cloudinary URL, check if it needs fixing
    if (src.includes('/v1/')) {
      // Replace generic /v1/ with the specific version number and add .jpg extension
      fixedSrc = src.replace('/v1/', '/v1749732168/');
      
      // Add .jpg.jpg extension if it ends with .jpg but not .jpg.jpg
      if (fixedSrc.endsWith('.jpg') && !fixedSrc.endsWith('.jpg.jpg')) {
        fixedSrc = fixedSrc + '.jpg';
      }
    } else {
      // Use the URL as is if it already has a proper version or no version
      fixedSrc = src;
    }
  } else if (src.startsWith('mentors/') || src.includes('/')) {
    // If it's just the path from database, construct the full Cloudinary URL
    // Remove any leading slash and ensure proper format
    const cleanPath = src.startsWith('/') ? src.substring(1) : src;
    
    // For mentor images, add .jpg.jpg as that seems to be the pattern
    let finalPath = cleanPath;
    if (cleanPath.includes('mentors/') && cleanPath.endsWith('.jpg') && !cleanPath.endsWith('.jpg.jpg')) {
      finalPath = `${cleanPath}.jpg`;
    } else if (!cleanPath.includes('.')) {
      finalPath = `${cleanPath}.jpg`;
    }
    
    // Use the specific version number
    fixedSrc = `https://res.cloudinary.com/dnq1fzs1l/image/upload/v1749732168/${finalPath}`;
  }
  
  console.log('Original URL:', src);
  console.log('Fixed URL:', fixedSrc);
  
  // Use a default image if image failed to load
  const defaultImage = "https://via.placeholder.com/150/cccccc/666666?text=No+Image";
  const imageSrc = imageError ? defaultImage : fixedSrc;
  
  return (
    <img 
      src={imageSrc} 
      alt={alt || "Avatar"} 
      className={`w-full h-full object-cover rounded-full ${className}`}
      onError={(e) => {
        console.log('Image failed to load:', e.target.src);
        if (!imageError) {
          setImageError(true);
        }
      }}
    />
  );
};
const AvatarFallback = ({ children, className = "" }) => (
  <div className={`text-gray-600 font-medium ${className}`}>{children}</div>
);


const MentorGrid = ({ mentors, onViewProfile }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {mentors.map((mentor) => (
        <Card key={mentor.id} className="overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-start space-x-4">
              <Avatar className="h-16 w-16 border-2 border-purple-100">
                <AvatarImage 
                  src={mentor.profile_image_url} 
                  alt={mentor.name}
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
                {/* <AvatarFallback>{mentor.name?.charAt(0) || 'M'}</AvatarFallback> */}
              </Avatar>
              <div className="space-y-1">
                <h3 className="font-medium text-lg">{mentor.name}</h3>
                <p className="text-purple-600 font-medium">{mentor.expertise_level}</p>
                <div className="flex items-center text-sm">
                  <Star className="h-4 w-4 text-yellow-500 mr-1 fill-yellow-500" />
                  <span>{mentor.rating || 0}</span>
                  <span className="text-gray-500 ml-1">({mentor.total_sessions || 0} sessions)</span>
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <p className="text-gray-600 text-sm">
                <span className="font-medium">Experience:</span> {mentor.experience || 'Not specified'}
              </p>

              <p className="text-gray-600 text-sm">
                <span className="font-medium">Hourly Rate:</span> Rs.{mentor.hourly_rate || 0}/hr
              </p>

              {mentor.subjects && mentor.subjects.length > 0 && (
                <div>
                  <span className="text-sm font-medium block mb-1">Subjects:</span>
                  <div className="flex flex-wrap gap-1">
                    {mentor.subjects.map((subject, index) => (
                      <Badge key={subject.id || index} variant="outline" className="bg-purple-50">
                        {typeof subject === 'string' ? subject : subject.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {mentor.bio && (
                <p className="text-gray-600 text-sm">
                  <span className="font-medium">Bio:</span> {mentor.bio.length > 100 ? `${mentor.bio.substring(0, 100)}...` : mentor.bio}
                </p>
              )}

              {mentor.is_available && (
                <div className="flex items-center text-sm text-green-600">
                  <Clock className="h-4 w-4 mr-1" />
                  <span>Available for sessions</span>
                </div>
              )}
            </div>
          </CardContent>

          <CardFooter className="bg-gray-50 px-6 py-4">
            <Button 
              onClick={() => onViewProfile(mentor)} 
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              View Profile
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
};

MentorGrid.propTypes = {
  mentors: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
      name: PropTypes.string.isRequired,
      profile_image_url: PropTypes.string,
      expertise_level: PropTypes.string,
      rating: PropTypes.number,
      total_sessions: PropTypes.number,
      total_students: PropTypes.number,
      experience: PropTypes.string,
      subjects: PropTypes.arrayOf(PropTypes.string),
      bio: PropTypes.string,
      hourly_rate: PropTypes.number,
      is_available: PropTypes.bool,
    })
  ).isRequired,
  onViewProfile: PropTypes.func.isRequired,
};

export default MentorGrid;