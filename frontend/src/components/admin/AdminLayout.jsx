import React, { useEffect } from "react";
import { useDispatch } from "react-redux";
import { checkAuthStatus } from "../../store/adminSlice";
import { Bell, MessageSquare } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "../../components/ui/sidebar";
import AdminSidebar from "./AdminSidebar";

const AdminLayout = ({ children }) => {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(checkAuthStatus());
  }, [dispatch]);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-slate-50">
        <AdminSidebar />
        <div className="flex flex-col flex-1">
          <div className="flex items-center border-b bg-white p-4 shadow-sm">
            <SidebarTrigger />
            <h1 className="text-xl font-bold ml-4">Admin Dashboard</h1>
            <div className="ml-auto flex items-center space-x-2">
              <button className="rounded-full bg-primary/10 p-2">
                <Bell className="h-5 w-5" />
              </button>
              <button className="rounded-full bg-primary/10 p-2">
                <MessageSquare className="h-5 w-5" />
              </button>
            </div>
          </div>
          <main className="flex-1 p-6 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AdminLayout;
