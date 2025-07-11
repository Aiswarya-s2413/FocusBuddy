import { Routes, Route, Navigate } from "react-router-dom";
import AdminLogin from "../pages/admin/AdminLogin";
import AdminUsers from "../pages/admin/AdminUsers";
import { useSelector } from "react-redux";
import AdminMentorsApproval from "../pages/admin/AdminMentorsApproval";
import AdminLayout from "../components/admin/AdminLayout";
import AdminWallet from "../pages/admin/AdminWallet";
import AdminFocusSessions from "../pages/admin/AdminFocusSessions";
import Admin from "../pages/admin/Admin";
import AdminMentorReports from "../pages/admin/AdminMentorReports";

const ProtectedAdminRoute = ({ children }) => {
  const { admin } = useSelector((state) => state.admin);

  console.log('ProtectedAdminRoute - Admin:', admin);

  if (!admin) {
    console.log('Redirecting to /admin/login');
    return <Navigate to="/admin/login" replace />;
  }

  return children;
};

const AdminRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<AdminLogin />} />
      <Route
        path="/users"
        element={
          <ProtectedAdminRoute>
           <AdminLayout> <AdminUsers /></AdminLayout>
          </ProtectedAdminRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedAdminRoute>
            <AdminLayout><Admin /></AdminLayout>
          </ProtectedAdminRoute>
        }
        />
      <Route
        path="/mentors"
        element={
          <ProtectedAdminRoute>
            <AdminLayout><AdminMentorsApproval /></AdminLayout>
          </ProtectedAdminRoute>
        }
        />

      <Route
        path="/wallet"
        element={
          <ProtectedAdminRoute>
            <AdminLayout><AdminWallet /></AdminLayout>
          </ProtectedAdminRoute>
        }
        />

      <Route
        path="/focussessions"
        element={
          <ProtectedAdminRoute>
            <AdminLayout><AdminFocusSessions /></AdminLayout>
          </ProtectedAdminRoute>
        }
        />

    <Route
       path="/mentor-reports"
       element={
         <ProtectedAdminRoute>
           <AdminLayout><AdminMentorReports /></AdminLayout>
         </ProtectedAdminRoute>
       }
     />

      <Route
        path="/"
        element={
          <ProtectedAdminRoute>
            <Navigate to="/admin/users" replace />
          </ProtectedAdminRoute>
        }
      />
      
      <Route path="*" element={<Navigate to="/admin/login" replace />} />
    </Routes>
  );
};

export default AdminRoutes;
