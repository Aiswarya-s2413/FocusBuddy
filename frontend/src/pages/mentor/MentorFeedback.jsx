import React, { useEffect, useState } from 'react';
import axios from '../../utils/axios';
import { Card } from '../../components/ui/card';
import { Table, TableHeader, TableHeaderCell, TableRow, TableCell, TableBody } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { StarIcon, MessageSquare } from 'lucide-react';

const MentorFeedback = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const res = await axios.get('/api/mentor/session-reviews/');
        if (res.data && res.data.reviews) {
          // Sort by date descending
          const sorted = res.data.reviews.sort((a, b) => {
            const dateA = new Date(a.scheduled_date + 'T' + a.scheduled_time);
            const dateB = new Date(b.scheduled_date + 'T' + b.scheduled_time);
            return dateB - dateA;
          });
          setReviews(sorted);
        }
      } catch (err) {
        setReviews([]);
      } finally {
        setLoading(false);
      }
    };
    fetchReviews();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 py-10 px-2 md:px-8">
      <div className="max-w-full mx-auto">
        <Card className="shadow-lg border border-slate-200 rounded-xl overflow-x-auto">
          <div className="flex items-center gap-3 px-10 pt-10 pb-6 border-b">
            <div className="bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full p-3">
              <MessageSquare className="h-7 w-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-800 mb-1">Session Feedback & Ratings</h2>
              <p className="text-slate-500 text-sm">See what students are saying about your sessions</p>
            </div>
          </div>
          <div className="p-8">
            <div className="overflow-x-auto rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/80">
                    <TableHeaderCell>Student</TableHeaderCell>
                    <TableHeaderCell>Date</TableHeaderCell>
                    <TableHeaderCell>Time</TableHeaderCell>
                    <TableHeaderCell>Rating</TableHeaderCell>
                    <TableHeaderCell>Feedback</TableHeaderCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8">Loading...</TableCell></TableRow>
                  ) : reviews.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-gray-500">No feedback yet.</TableCell></TableRow>
                  ) : (
                    reviews.map((review, idx) => (
                      <TableRow key={review.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                        <TableCell className="font-medium text-slate-700">{review.student?.name || '-'}</TableCell>
                        <TableCell className="text-slate-600">{review.scheduled_date}</TableCell>
                        <TableCell className="text-slate-600">{review.scheduled_time?.slice(0,5)}</TableCell>
                        <TableCell>
                          {review.rating ? (
                            <span className="flex items-center gap-1 text-yellow-500 font-semibold">
                              {review.rating} <StarIcon size={16} />
                              {review.rating === 5 && (
                                <Badge className="ml-2 bg-green-100 text-green-700 border-green-200">5 Star</Badge>
                              )}
                            </span>
                          ) : '-'}
                        </TableCell>
                        <TableCell className="max-w-xs text-slate-700">
                          {review.review_text ? (
                            <span className="block whitespace-pre-line">{review.review_text}</span>
                          ) : (
                            <span className="italic text-slate-400">No comment</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default MentorFeedback; 