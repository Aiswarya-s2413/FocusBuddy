import React, { useEffect, useState } from "react";
import { adminAxios } from "../../utils/axios";
import { Button } from "../../components/ui/button";
import { useSimpleToast } from "../../components/ui/toast";

const AdminMentorReports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast, ToastContainer } = useSimpleToast();

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await adminAxios.get("mentor-reports/");
      if (Array.isArray(res.data)) {
        setReports(res.data);
      } else if (res.data && Array.isArray(res.data.data)) {
        setReports(res.data.data);
      } else {
        setReports([]);
      }
    } catch (err) {
      toast.error("Failed to fetch reports");
      setReports([]);
    }
    setLoading(false);
  };

  const toggleMentorBlock = async (mentor_id, currentlyActive) => {
    const action = currentlyActive ? "block" : "unblock";
    try {
      await adminAxios.post(`block-mentor/${mentor_id}/`);
      toast.success(`Mentor ${action}ed!`);
      fetchReports();
    } catch (err) {
      toast.error(`Failed to ${action} mentor`);
    }
  };

  useEffect(() => {
    fetchReports();
    // eslint-disable-next-line
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <ToastContainer />
      <h2 className="text-xl font-bold mb-4">Mentor Reports</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full border border-gray-300">
          <thead className="bg-gray-50">
            <tr>
              <th className="border border-gray-300 px-4 py-2 text-left font-medium text-gray-700">Mentor</th>
              <th className="border border-gray-300 px-4 py-2 text-left font-medium text-gray-700">Email</th>
              <th className="border border-gray-300 px-4 py-2 text-left font-medium text-gray-700">Reported By</th>
              <th className="border border-gray-300 px-4 py-2 text-left font-medium text-gray-700 w-64">Reason</th>
              <th className="border border-gray-300 px-4 py-2 text-left font-medium text-gray-700">Reported At</th>
              {/* <th className="border border-gray-300 px-4 py-2 text-left font-medium text-gray-700">Status</th>
              <th className="border border-gray-300 px-4 py-2 text-left font-medium text-gray-700">Action</th> */}
            </tr>
          </thead>
          <tbody>
            {(Array.isArray(reports) ? reports : []).map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="border border-gray-300 px-4 py-2">{r.mentor_name}</td>
                <td className="border border-gray-300 px-4 py-2">{r.mentor_email}</td>
                <td className="border border-gray-300 px-4 py-2">{r.reporter_name} ({r.reporter_email})</td>
                <td className="border border-gray-300 px-4 py-2 max-w-xs">
                  <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                    {r.reason}
                  </div>
                </td>
                <td className="border border-gray-300 px-4 py-2">{new Date(r.created_at).toLocaleString()}</td>
                {/* <td className="border border-gray-300 px-4 py-2">
                  {r.mentor_is_active ? (
                    <span className="text-green-600 font-medium">Active</span>
                  ) : (
                    <span className="text-red-600 font-medium">Blocked</span>
                  )}
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  <Button
                    variant={r.mentor_is_active ? "destructive" : "default"}
                    className={r.mentor_is_active ? "bg-red-600 hover:bg-red-700 text-white" : "bg-green-600 hover:bg-green-700 text-white"}
                    onClick={() => toggleMentorBlock(r.mentor_id, r.mentor_is_active)}
                  >
                    {r.mentor_is_active ? "Block" : "Unblock"}
                  </Button>
                </td> */}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminMentorReports;