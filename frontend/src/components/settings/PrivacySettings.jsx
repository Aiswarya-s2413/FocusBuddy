import React from "react";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Shield } from "lucide-react";

const PrivacySettings = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="h-5 w-5" />
        <h2 className="text-xl font-semibold">Privacy Settings</h2>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Stay Anonymous</Label>
            <p className="text-sm text-muted-foreground">
              Show only initials in peer matches
            </p>
          </div>
          <Switch />
        </div>

        <div className="space-y-2">
          <Label>Preferred Time</Label>
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="Select preferred time" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="morning">Morning</SelectItem>
                <SelectItem value="afternoon">Afternoon</SelectItem>
                <SelectItem value="evening">Evening</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Preferred Region</Label>
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="Select preferred region" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="any">Any Region</SelectItem>
                <SelectItem value="local">Local Only</SelectItem>
                <SelectItem value="international">International</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};

export default PrivacySettings;
