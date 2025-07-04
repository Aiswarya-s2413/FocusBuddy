import React, { useState } from "react";
import { Button } from "../../components/ui/button";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { adminAxios } from '../../utils/axios';
import { toast } from "react-hot-toast";
import { useDispatch } from "react-redux";
import { adminLogout } from "../../store/adminSlice";
import {
  Users,
  Calendar,
  CreditCard,
  BookOpen,
  Users2,
  HelpCircle,
  MessageSquare,
  Bell,
  Settings,
  LayoutDashboard,
  LogOut,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarSeparator,
} from "../../components/ui/sidebar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";

const adminMenuItems = [
  { title: "Dashboard", icon: LayoutDashboard, path: "/admin" },
  { title: "Users", icon: Users, path: "/admin/users" },
  { title: "Mentor Requests", icon: CreditCard, path: "/admin/mentors" },
  { title: "Wallet", icon: BookOpen, path: "/admin/wallet" },
  { title: "Focus Buddy", icon: Users2, path: "/admin/focussessions" },
  // { title: "Support", icon: HelpCircle, path: "/admin/support" },
  // { title: "FAQ", icon: MessageSquare, path: "/admin/faq" },
  // { title: "Notifications", icon: Bell, path: "/admin/notifications" },
  // { title: "Settings", icon: Settings, path: "/admin/settings" },
];

const AdminSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogoutClick = () => {
    setShowLogoutModal(true);
  };

  const handleConfirmLogout = async () => {
    setIsLoggingOut(true);
    try {
      
      
      // Dispatch the logout action to update Redux state
      dispatch(adminLogout());
      
      // Show success message
      toast.success('Logged out successfully');
      
      // Redirect to login page
      navigate('/admin/login');
    } catch (error) {
      console.error('Logout error:', error);
      
      // Even if API call fails, force logout on the client side
      
      toast.success('Logged out successfully');
      navigate('/admin/login');
    } finally {
      setIsLoggingOut(false);
      setShowLogoutModal(false);
    }
  };

  const handleCancelLogout = () => {
    setShowLogoutModal(false);
  };

  return (
    <>
      <Sidebar className="border-r border-slate-200">
        <SidebarHeader className="border-b">
          <div className="flex items-center gap-2 px-5 py-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-purple-500">
              <span className="text-lg font-bold text-primary-foreground">F</span>
            </div>
            <div>
              <h2 className="text-lg font-semibold">Focus Admin</h2>
              <p className="text-xs text-muted-foreground">Management Portal</p>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {adminMenuItems.map((item) => (
              <SidebarMenuItem key={item.path}>
                <SidebarMenuButton 
                  asChild
                  isActive={location.pathname === item.path}
                  tooltip={item.title}
                  className="transition-colors"
                >
                  <Link to={item.path} className="flex items-center">
                    <item.icon className="mr-3 h-5 w-5" />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          <SidebarSeparator />
          <div className="p-4">
            <div className="flex items-center gap-3 rounded-md bg-muted/50 p-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                <span className="text-sm font-medium">AD</span>
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-sm font-medium">Admin User</p>
              </div>
              <Button
                variant="outline"
                onClick={handleLogoutClick}
                className="flex items-center gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                disabled={isLoggingOut}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </SidebarFooter>
      </Sidebar>

      {/* Logout Confirmation Modal */}
      <Dialog open={showLogoutModal} onOpenChange={setShowLogoutModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LogOut className="h-5 w-5 text-red-600" />
              Confirm Logout
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to logout from the admin panel? 
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button 
              variant="outline" 
              onClick={handleCancelLogout}
              disabled={isLoggingOut}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleConfirmLogout}
              disabled={isLoggingOut}
              className="flex items-center gap-2"
            >
              {isLoggingOut ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Logging out...
                </>
              ) : (
                <>
                  <LogOut className="h-4 w-4" />
                  Logout
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminSidebar;