import React from "react";
import PropTypes from "prop-types";
import { Star, Clock } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import { Card, CardContent, CardFooter } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";

const MentorGrid = ({ mentors, onViewProfile }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {mentors.map((mentor) => (
        <Card key={mentor.id} className="overflow-hidden">
          <CardContent className="p-6">
            <div className="flex items-start space-x-4">
              <Avatar className="h-16 w-16 border-2 border-purple-100">
                <AvatarImage src={mentor.profilePicture} alt={mentor.name} />
                <AvatarFallback>{mentor.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <h3 className="font-medium text-lg">{mentor.name}</h3>
                <p className="text-purple-600 font-medium">{mentor.specialization}</p>
                <div className="flex items-center text-sm">
                  <Star className="h-4 w-4 text-yellow-500 mr-1 fill-yellow-500" />
                  <span>{mentor.rating}</span>
                  <span className="text-gray-500 ml-1">({mentor.reviewCount} reviews)</span>
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <p className="text-gray-600 text-sm">
                <span className="font-medium">Experience:</span> {mentor.experience}
              </p>

              <div>
                <span className="text-sm font-medium block mb-1">Languages:</span>
                <div className="flex flex-wrap gap-1">
                  {mentor.languages.map((lang) => (
                    <Badge key={lang} variant="outline" className="bg-purple-50">
                      {lang}
                    </Badge>
                  ))}
                </div>
              </div>

              {mentor.nextAvailable && (
                <div className="flex items-center text-sm text-green-600">
                  <Clock className="h-4 w-4 mr-1" />
                  <span>Next available: {mentor.nextAvailable}</span>
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
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      profilePicture: PropTypes.string,
      specialization: PropTypes.string,
      rating: PropTypes.number,
      reviewCount: PropTypes.number,
      experience: PropTypes.string,
      languages: PropTypes.arrayOf(PropTypes.string),
      nextAvailable: PropTypes.string,
    })
  ).isRequired,
  onViewProfile: PropTypes.func.isRequired,
};

export default MentorGrid;
