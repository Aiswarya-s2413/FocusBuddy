import React, { useEffect, useState, useMemo } from "react";
import { adminAxios } from "../../utils/axios";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { useSimpleToast } from "../../components/ui/toast";
import { Search, X } from "lucide-react";

const AdminMentorReports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
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

  // Filter reports by mentor/reporter name/email or reason
  const filteredReports = useMemo(() => {
    if (!searchQuery.trim()) return reports;
    const q = searchQuery.toLowerCase();
    return reports.filter(r =>
      r.mentor_name?.toLowerCase().includes(q) ||
      r.mentor_email?.toLowerCase().includes(q) ||
      r.reporter_name?.toLowerCase().includes(q) ||
      r.reporter_email?.toLowerCase().includes(q) ||
      r.reason?.toLowerCase().includes(q)
    );
  }, [reports, searchQuery]);

  // UI
  return (
    <div className="container mx-auto px-4 py-8">
      <ToastContainer />
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold">Mentor Reports</h1>
        </div>
        <div className="relative flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 h-5 w-5" />
            <Input
              type="text"
              placeholder="Search by mentor, reporter, or reason..."
              value={searchQuery}
              onChange={e => {
                setSearchQuery(e.target.value);
                setIsSearching(true);
                setTimeout(() => setIsSearching(false), 400);
              }}
              className="pl-10 pr-10"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
          {isSearching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900"></div>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <p className="text-lg">Loading mentor reports...</p>
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-lg text-gray-500">
            {searchQuery ? "No reports found matching your search." : "No mentor reports found."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border border-gray-200">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mentor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reported By</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-64">Reason</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reported At</th>
                {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th> */}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredReports.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{r.mentor_name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{r.mentor_email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{r.reporter_name} ({r.reporter_email})</div>
                  </td>
                  <td className="px-6 py-4 max-w-xs">
                    <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">{r.reason}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{new Date(r.created_at).toLocaleString()}</div>
                  </td>
                  {/* <td className="px-6 py-4 whitespace-nowrap">
                    {r.mentor_is_active ? (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Active</span>
                    ) : (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">Blocked</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
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
      )}
    </div>
  );
};

export default AdminMentorReports;