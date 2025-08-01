import React, { useState } from "react";
import PropTypes from "prop-types";
import { Search, Filter } from "lucide-react";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "../../components/ui/sheet";
import { Slider } from "../../components/ui/slider";
import { Checkbox } from "../../components/ui/checkbox";
import { Label } from "../../components/ui/label";
import { useEffect } from "react";

const MentorHeader = ({ onSearch, onFilterChange }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({
    subjects: [],
    experience: [], // Changed from topics to subjects and experience
    rating: 0,
    availability: null,
  });

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    onSearch(e.target.value);
  };

  // Changed from handleTopicChange to handleSubjectChange
  const handleSubjectChange = (subject, checked) => {
    const updatedSubjects = checked
      ? [...filters.subjects, subject]
      : filters.subjects.filter((s) => s !== subject);

    const updatedFilters = { ...filters, subjects: updatedSubjects };
    setFilters(updatedFilters);
    onFilterChange(updatedFilters);
  };

  const handleExperienceChange = (exp, checked) => {
    const updatedExp = checked
      ? [...filters.experience, exp]
      : filters.experience.filter((e) => e !== exp);

    const updatedFilters = { ...filters, experience: updatedExp };
    setFilters(updatedFilters);
    onFilterChange(updatedFilters);
  };

  const handleRatingChange = (value) => {
    const updatedFilters = { ...filters, rating: value[0] };
    setFilters(updatedFilters);
    onFilterChange(updatedFilters);
  };

  // Clear all filters
  const clearFilters = () => {
    const clearedFilters = {
      subjects: [],
      experience: [],
      rating: 0,
      availability: null,
    };
    setFilters(clearedFilters);
    onFilterChange(clearedFilters);
  };

  return (
    <div className="space-y-6 mb-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Meet Your Mentors</h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Book a one-on-one session with a productivity mentor to help guide your focus journey.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 h-5 w-5" />
          <Input
            placeholder="Search by mentor name, expertise, or availability..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="pl-10"
          />
        </div>

        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" className="flex items-center gap-2">
              <Filter size={16} />
              <span>Filters</span>
              {/* Show active filter count */}
              {(filters.subjects.length > 0 || filters.experience.length > 0 || filters.rating > 0) && (
                <span className="bg-purple-600 text-white rounded-full px-2 py-1 text-xs">
                  {filters.subjects.length + filters.experience.length + (filters.rating > 0 ? 1 : 0)}
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[300px] sm:w-[400px] overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Filter Mentors</SheetTitle>
            </SheetHeader>

            <div className="py-4 space-y-6">
              {/* Subjects Filter */}
              <div className="space-y-4">
                <h3 className="font-medium">Subjects</h3>
                <div className="grid grid-cols-1 gap-3">
                  {["Mathematics", "Science", "Languages", "Social Science", "Computer", "Art", "Philosophy", "Psychology"].map((subject) => (
                    <div key={subject} className="flex items-center space-x-2">
                      <Checkbox
                        id={`subject-${subject}`}
                        checked={filters.subjects.includes(subject)}
                        onCheckedChange={(checked) => handleSubjectChange(subject, checked === true)}
                      />
                      <Label htmlFor={`subject-${subject}`}>{subject}</Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Experience Filter */}
              <div className="space-y-4">
                <h3 className="font-medium">Experience</h3>
                <div className="grid grid-cols-1 gap-3">
                  {["0-1 years", "1-2 years", "2-5 years", "5+ years"].map((exp) => (
                    <div key={exp} className="flex items-center space-x-2">
                      <Checkbox
                        id={`exp-${exp}`}
                        checked={filters.experience.includes(exp)}
                        onCheckedChange={(checked) => handleExperienceChange(exp, checked === true)}
                      />
                      <Label htmlFor={`exp-${exp}`}>{exp}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-medium">Minimum Rating</h3>
                <div className="px-2">
                  <Slider
                    value={[filters.rating]}
                    max={5}
                    step={1}
                    onValueChange={handleRatingChange}
                  />
                  <div className="flex justify-between mt-2 text-sm text-gray-500">
                    <span>Any</span>
                    <span>⭐ 1</span>
                    <span>⭐ 2</span>
                    <span>⭐ 3</span>
                    <span>⭐ 4</span>
                    <span>⭐ 5</span>
                  </div>
                </div>
                <p className="text-sm text-gray-500">
                  Current: {filters.rating === 0 ? "Any" : `⭐ ${filters.rating}+`}
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={clearFilters}
                >
                  Clear All
                </Button>
                
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
};

MentorHeader.propTypes = {
  onSearch: PropTypes.func.isRequired,
  onFilterChange: PropTypes.func.isRequired,
};

export default MentorHeader;