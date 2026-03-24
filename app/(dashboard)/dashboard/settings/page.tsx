"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ManagerList } from "@/components/dashboard/settings/ManagerList";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

export default function SettingsPage() {
  const { profile, user } = useAuth();

  // Change username
  const [newUsername, setNewUsername] = useState("");
  const [isChangingUsername, setIsChangingUsername] = useState(false);

  // Change password
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [isChanging, setIsChanging] = useState(false);

  // Change email
  const [newEmail, setNewEmail] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [showEmailPwd, setShowEmailPwd] = useState(false);
  const [isChangingEmail, setIsChangingEmail] = useState(false);

  async function handleChangeUsername(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newUsername.trim();
    if (!trimmed) return;
    setIsChangingUsername(true);
    try {
      const res = await fetch("/api/auth/change-username", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newUsername: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to change username");
        return;
      }
      toast.success("Username updated successfully");
      setNewUsername("");
      // Refresh profile in Supabase client so the displayed name updates
      const supabase = createClient();
      if (supabase && user) {
        const { data: updated } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        if (updated) {
          // Force a page reload so AuthContext re-fetches the updated profile
          window.location.reload();
        }
      }
    } catch {
      toast.error("Failed to change username");
    } finally {
      setIsChangingUsername(false);
    }
  }

  async function handleChangeEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!newEmail.trim() || !emailPassword) return;
    setIsChangingEmail(true);
    try {
      const res = await fetch("/api/auth/change-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newEmail: newEmail.trim(), currentPassword: emailPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to change email");
        return;
      }
      toast.success("Email updated successfully");
      setNewEmail("");
      setEmailPassword("");
    } catch {
      toast.error("Failed to change email");
    } finally {
      setIsChangingEmail(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    setIsChanging(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to change password");
        return;
      }

      toast.success("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      toast.error("Failed to change password");
    } finally {
      setIsChanging(false);
    }
  }

  return (
    <>
      <DashboardHeader title="Settings" />
      <div className="p-4 lg:p-8 space-y-6 max-w-4xl">
        {/* Account Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Username</span>
              <span className="text-sm font-medium">
                {profile?.name || <span className="text-gray-400 italic">Not set</span>}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Email</span>
              <span className="text-sm font-medium">
                {profile?.email || "—"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Role</span>
              <Badge variant="secondary" className="capitalize">
                {profile?.role || "—"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Change Username */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Change Username</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangeUsername} className="space-y-4 max-w-md">
              <div className="space-y-2">
                <Label htmlFor="new-username">New Username</Label>
                <Input
                  id="new-username"
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="letters, numbers, underscores only"
                  required
                  minLength={3}
                  maxLength={30}
                />
                <p className="text-xs text-muted-foreground">
                  3–30 characters. Letters, numbers, and underscores only.
                  Once changed, your old username cannot be used again.
                </p>
              </div>
              <Button type="submit" disabled={isChangingUsername}>
                {isChangingUsername ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Updating...</>
                ) : (
                  "Change Username"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Change Email */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Change Email</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangeEmail} className="space-y-4 max-w-md">
              <div className="space-y-2">
                <Label htmlFor="new-email">New Email Address</Label>
                <Input
                  id="new-email"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="new@example.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email-password">Current Password (to confirm)</Label>
                <div className="relative">
                  <Input
                    id="email-password"
                    type={showEmailPwd ? "text" : "password"}
                    value={emailPassword}
                    onChange={(e) => setEmailPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    onClick={() => setShowEmailPwd(!showEmailPwd)}
                    tabIndex={-1}
                  >
                    {showEmailPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" disabled={isChangingEmail}>
                {isChangingEmail ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Updating...</>
                ) : (
                  "Change Email"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Change Password</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
              <div className="space-y-2">
                <Label htmlFor="current-password">Current Password</Label>
                <div className="relative">
                  <Input
                    id="current-password"
                    type={showCurrent ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    onClick={() => setShowCurrent(!showCurrent)}
                    tabIndex={-1}
                  >
                    {showCurrent ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showNew ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min 8 chars, 1 uppercase, 1 number"
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    onClick={() => setShowNew(!showNew)}
                    tabIndex={-1}
                  >
                    {showNew ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" disabled={isChanging}>
                {isChanging ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Changing...
                  </>
                ) : (
                  "Change Password"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Team Management */}
        {profile?.role === "admin" && <ManagerList />}
      </div>
    </>
  );
}
