"use client";

import { useState, useEffect, useCallback } from "react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { managerApps, managerRoles, type ManagerRole } from "@/lib/manager-accounts";
import { Plus, Trash2, KeyRound, UserCircle2, Loader2, Eye, EyeOff, Ban, UserCheck } from "lucide-react";

interface Manager {
  id: string;
  name: string | null;
  email: string | null;
  role: ManagerRole;
  access_removed?: boolean;
  created_at: string;
  suspended: boolean | null;
}

export default function ManagersPage() {
  const [managers, setManagers] = useState<Manager[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [appFilter, setAppFilter] = useState<ManagerRole | "all">("all");
  const [addRole, setAddRole] = useState<ManagerRole>("manager");

  // Add dialog
  const [showAdd, setShowAdd] = useState(false);
  const [addName, setAddName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addPassword, setAddPassword] = useState("");
  const [showAddPassword, setShowAddPassword] = useState(false);
  const [addConfirmPassword, setAddConfirmPassword] = useState("");
  const [showAddConfirm, setShowAddConfirm] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<Manager | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Reset password dialog
  const [resetTarget, setResetTarget] = useState<Manager | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  // Suspend
  const [suspendLoading, setSuspendLoading] = useState(false);

  const fetchManagers = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const res = await fetch("/api/managers");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to load accounts");
      setManagers(data);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Unable to load accounts. Please retry.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchManagers();
  }, [fetchManagers]);

  async function handleAdd() {
    setAddError("");
    if (!addName.trim() || !addEmail.trim()) {
      setAddError("Name and email are required.");
      return;
    }
    if (addPassword.length < 8 || !/[A-Z]/.test(addPassword) || !/[0-9]/.test(addPassword)) {
      setAddError(
        "Password must be at least 8 characters and include an uppercase letter and a number."
      );
      return;
    }
    if (addPassword !== addConfirmPassword) {
      setAddError("Passwords do not match.");
      return;
    }
    setAddLoading(true);
    try {
      const res = await fetch("/api/managers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: addName.trim(),
          email: addEmail.trim(),
          password: addPassword,
          role: addRole,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAddError(data.error || "Failed to create manager.");
        return;
      }
      toast.success(`Manager account created for ${addName.split(" ")[0]}`);
      setShowAdd(false);
      setAddName("");
      setAddEmail("");
      setAddPassword("");
      setAddConfirmPassword("");
      setAddRole("manager");
      setShowAddPassword(false);
      setShowAddConfirm(false);
      fetchManagers();
    } catch {
      setAddError("Network error. Please try again.");
    } finally {
      setAddLoading(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/managers/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success(`Access removed for ${deleteTarget.name || "Manager"}`);
        setDeleteTarget(null);
        fetchManagers();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to delete manager.");
      }
    } catch {
      toast.error("Network error. Refresh accounts to check the result before retrying.");
    } finally {
      setDeleteLoading(false);
    }
  }

  async function handleResetPassword() {
    if (!resetTarget || newPassword.length < 8) return;
    setResetLoading(true);
    try {
      const res = await fetch(`/api/managers/${resetTarget.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword }),
      });
      if (res.ok) {
        toast.success(`Password updated for ${resetTarget.name || "manager"}`);
        setResetTarget(null);
        setNewPassword("");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to update password.");
      }
    } catch {
      toast.error("Network error. Please refresh and retry.");
    } finally {
      setResetLoading(false);
    }
  }

  async function handleSuspend(manager: Manager, suspend: boolean) {
    setSuspendLoading(true);
    try {
      const res = await fetch(`/api/managers/${manager.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ suspended: suspend }),
      });
      if (res.ok) {
        toast.success(
          suspend
            ? `${manager.name || "Manager"} has been suspended`
            : `${manager.name || "Manager"} has been reactivated`
        );
        fetchManagers();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to update manager.");
      }
    } catch {
      toast.error("Network error. Refresh accounts to check the current status.");
    } finally {
      setSuspendLoading(false);
    }
  }

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-CA", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  return (
    <div className="flex flex-col min-h-full">
      <DashboardHeader
        title="Manage Accounts"
        subtitle="Staff access for Farm, Property and Content"
        actions={
          <Button onClick={() => setShowAdd(true)} size="sm">
            <Plus className="h-4 w-4 mr-1.5" />
            Add Manager
          </Button>
        }
      />

      <div className="flex-1 p-6 max-w-3xl">
        <div className="mb-5 space-y-1.5">
          <Label htmlFor="account-filter">Filter by app</Label>
          <select id="account-filter" value={appFilter} onChange={(event) => setAppFilter(event.target.value as ManagerRole | "all")} className="h-11 w-full rounded-md border bg-white px-3 text-sm">
            <option value="all">All apps</option>
            {managerRoles.map((role) => <option key={role} value={role}>{managerApps[role].label}</option>)}
          </select>
        </div>
        {loadError ? <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{loadError}<Button className="ml-3" variant="outline" onClick={fetchManagers}>Retry</Button></div> :
        loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-8">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading managers...
          </div>
        ) : managers.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-white p-10 text-center">
            <UserCircle2 className="h-10 w-10 mx-auto text-gray-300 mb-3" />
            <p className="text-sm font-medium text-gray-500">No managers yet</p>
            <p className="text-xs text-gray-400 mt-1">
              Add a staff account with access to the appropriate app
            </p>
            <Button
              size="sm"
              variant="outline"
              className="mt-4"
              onClick={() => setShowAdd(true)}
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Add First Manager
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {appFilter !== "all" && !managers.some((m) => m.role === appFilter) && <p className="rounded-lg border bg-white p-5 text-sm text-gray-600">No accounts for this app yet.</p>}
            {managers.filter((m) => appFilter === "all" || m.role === appFilter).map((m) => (
              <div
                key={m.id}
                className="flex flex-wrap items-center gap-4 rounded-xl border border-gray-100 bg-white px-5 py-4 shadow-sm"
              >
                <div className="h-10 w-10 rounded-full bg-[#1B4332]/10 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-[#1B4332]">
                    {(m.name || m.email || "M")[0].toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {m.name || "—"}
                    </p>
                    {(m.suspended || m.access_removed) && (
                      <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-600 border border-red-100 shrink-0">
                        {m.access_removed ? "Access removed" : "Suspended"}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 truncate">{m.email}</p>
                  <p className="text-xs font-semibold text-gray-700 mt-1">{managerApps[m.role].label}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Added {formatDate(m.created_at)}
                  </p>
                </div>
                {!m.access_removed && <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setResetTarget(m);
                      setNewPassword("");
                    }}
                    className="min-h-11 px-3 text-xs gap-1.5"
                  >
                    <KeyRound className="h-3.5 w-3.5" />
                    Reset Password
                  </Button>
                  {m.suspended ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSuspend(m, false)}
                      disabled={suspendLoading}
                      className="min-h-11 px-3 text-xs gap-1.5 text-green-800 hover:text-green-900 hover:border-green-200"
                    >
                      <UserCheck className="h-3.5 w-3.5" />
                      Reactivate
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSuspend(m, true)}
                      disabled={suspendLoading}
                      className="min-h-11 px-3 text-xs gap-1.5 text-amber-800 hover:text-amber-900 hover:border-amber-200"
                    >
                      <Ban className="h-3.5 w-3.5" />
                      Suspend
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setDeleteTarget(m)}
                    className="min-h-11 px-3 text-xs gap-1.5 text-red-700 hover:text-red-800 hover:border-red-200"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove access
                  </Button>
                </div>}
              </div>
            ))}
          </div>
        )}

        {/* Login instructions */}
        <div className="mt-6 rounded-xl bg-[#1B4332]/5 border border-[#1B4332]/10 p-4">
          <p className="text-sm font-semibold text-[#1B4332] mb-1">
            How managers log in
          </p>
          <p className="text-xs text-gray-600">
            Each account can access its assigned app. Share its email, password and the appropriate login link securely.
          </p>
          <ul className="mt-3 space-y-2 text-xs">{managerRoles.map((role) => <li key={role}><a className="font-semibold underline break-all" href={managerApps[role].login}>{managerApps[role].label}: {managerApps[role].login}</a></li>)}</ul>
        </div>
      </div>

      {/* Add Manager Dialog */}
      <Dialog
        open={showAdd}
        onOpenChange={(o) => {
          setShowAdd(o);
          if (!o) {
            setAddName("");
            setAddEmail("");
            setAddPassword("");
            setAddConfirmPassword("");
            setShowAddPassword(false);
            setShowAddConfirm(false);
            setAddError("");
            setAddRole("manager");
          }
        }}
      >
        <DialogContent className="max-w-md max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Staff Account</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="m-app">App access</Label>
              <select id="m-app" value={addRole} onChange={(event) => setAddRole(event.target.value as ManagerRole)} className="h-11 w-full rounded-md border bg-white px-3 text-sm">
                {managerRoles.map((role) => <option key={role} value={role}>{managerApps[role].label}</option>)}
              </select>
              <p className="text-xs text-muted-foreground">Access is limited to this app. This does not grant CEO access.</p>
            </div>
            {addError && (
              <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
                {addError}
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="m-name">Full Name</Label>
              <Input
                id="m-name"
                placeholder="e.g. Chidi Okeke"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-email">Email Address</Label>
              <Input
                id="m-email"
                type="email"
                placeholder="manager@primefield.ng"
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-password">Password</Label>
              <div className="relative">
                <Input
                  id="m-password"
                  type={showAddPassword ? "text" : "password"}
                  placeholder="e.g. Primefield1"
                  value={addPassword}
                  onChange={(e) => setAddPassword(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowAddPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                  aria-label={showAddPassword ? "Hide password" : "Show password"}
                >
                  {showAddPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Min. 8 characters, one uppercase letter, one number. Share
                securely with the manager.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-confirm">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="m-confirm"
                  type={showAddConfirm ? "text" : "password"}
                  placeholder="Repeat password"
                  value={addConfirmPassword}
                  onChange={(e) => setAddConfirmPassword(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowAddConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                  aria-label={showAddConfirm ? "Hide password" : "Show password"}
                >
                  {showAddConfirm ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAdd(false)}
              disabled={addLoading}
            >
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={addLoading}>
              {addLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                "Create Account"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove account access?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove access for{" "}
              <strong>{deleteTarget?.name || deleteTarget?.email}</strong>&apos;s
              account. They will no longer be able to use their assigned app.
              Their historical entries and attribution will be preserved. The email remains reserved. Removed access cannot be reactivated here; use Suspend for a temporary restriction.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteLoading}
              className="bg-red-500 hover:bg-red-600"
            >
              {deleteLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Yes, Remove Access"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Password Dialog */}
      <Dialog
        open={!!resetTarget}
        onOpenChange={(o) => {
          if (!o) {
            setResetTarget(null);
            setNewPassword("");
          }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Set a new password for{" "}
              <strong>{resetTarget?.name || resetTarget?.email}</strong>.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="new-pwd">New Password</Label>
              <Input
                id="new-pwd"
                type="password"
                placeholder="Min. 8 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setResetTarget(null)}
              disabled={resetLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleResetPassword}
              disabled={resetLoading || newPassword.length < 8}
            >
              {resetLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Updating...
                </>
              ) : (
                "Update Password"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
