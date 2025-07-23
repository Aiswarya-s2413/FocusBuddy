import React, { useState, useEffect } from "react";
import { Button } from "../../components/ui/button";
import { Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Card, CardHeader, CardContent, CardFooter } from "../../components/ui/card";
import axios from "axios";

const MentorSelectSubjects = () => {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState([]);
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const response = await axios.get("https://api.focusbuddy.aiswaryasathyan.space/api/mentor/select-subjects/");
        setSubjects(response.data);
        setLoading(false);
      } catch (err) {
        setError("Failed to fetch subjects. Please try again later.");
        setLoading(false);
      }
    };

    fetchSubjects();
  }, []);

  const toggleSubject = (id) => {
    setSelectedSubjects((prev) =>
      prev.includes(id)
        ? prev.filter((subjectId) => subjectId !== id)
        : [...prev, id]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedSubjects.length === 0) {
      setError("Please select at least one subject");
      return;
    }

    try {
      const email = localStorage.getItem("email");
      const response = await axios.post("https://api.focusbuddy.aiswaryasathyan.space/api/mentor/select-subjects/", {
        email,
        subjects: selectedSubjects,
      });

      if (response.status === 200) {
        // Clean up email from localStorage as signup is complete
        localStorage.removeItem("email");
        // Redirect to login with success parameter
        navigate("/mentor/login?signup=success");
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to save subjects. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg">Loading subjects...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <h2 className="text-2xl font-semibold text-center text-gray-900">
            Select Your Expertise
          </h2>
          <p className="text-center text-gray-600 mt-2">
            Choose the subjects you can mentor
          </p>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-4">
              {subjects.map((subject) => (
                <div
                  key={subject.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedSubjects.includes(subject.id)
                      ? "border-purple-600 bg-purple-50"
                      : "border-gray-200 hover:border-purple-300"
                  }`}
                  onClick={() => toggleSubject(subject.id)}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{subject.name}</span>
                    {selectedSubjects.includes(subject.id) && (
                      <Check className="h-5 w-5 text-purple-600" />
                    )}
                  </div>
                </div>
              ))}
            </div>

            {error && <p className="text-red-500 text-center">{error}</p>}

            <Button
              type="submit"
              className="w-full bg-purple-600 hover:bg-purple-700"
              disabled={selectedSubjects.length === 0}
            >
              Complete Signup
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default MentorSelectSubjects;