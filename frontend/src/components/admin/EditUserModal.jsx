import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";
import { adminAxios } from '../../utils/axios';
import { useSimpleToast } from "../ui/toast";

const EditUserModal = ({ isOpen, onClose, user, onUserUpdated }) => {
  const { toast, ToastContainer } = useSimpleToast();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    is_active: true,
  });

  useEffect(() => {
    if (user) {
      console.log("Setting initial form data:", user);
      setFormData({
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
        is_active: user.is_active,
      });
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    console.log("Form field changed:", name, value);
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("Submitting form with data:", formData);
    // Phone validation: must be exactly 10 digits, only numbers
    const phoneRegex = /^\d{10}$/;
    if (formData.phone && !phoneRegex.test(formData.phone)) {
      toast.error("Phone number must be exactly 10 digits and contain only numbers.");
      return;
    }
    try {
      // Only send the fields that the backend expects
      const updateData = {
        name: formData.name,
        phone: formData.phone,
        is_active: formData.is_active,
      };
      console.log("Sending update request with data:", updateData);

      const response = await adminAxios.put(`/users/${user.id}/edit/`, updateData);
      console.log("Received response:", response.data);
      
      if (response.data && response.data.user) {
        console.log("Updating user in parent component:", response.data.user);
        onUserUpdated(response.data.user);
        toast.success("User updated successfully");
        onClose();
      } else {
        console.error("Invalid response format:", response.data);
        throw new Error("Invalid response format");
      }
    } catch (error) {
      console.error("Error updating user:", error);
      console.error("Error response:", error.response?.data);
      toast.error(error.response?.data?.error || "Failed to update user");
    }
  };

  return (
    <>
      <ToastContainer />
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter email"
              disabled
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="Enter phone number"
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="is_active">Active Status</Label>
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => {
                console.log("Active status changed:", checked);
                setFormData((prev) => ({ ...prev, is_active: checked }));
              }}
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Save Changes</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
    </>
  );
};

export default EditUserModal; 