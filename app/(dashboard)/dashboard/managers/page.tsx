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
import { Plus, Trash2, KeyRound, UserCircle2, Loader2 } from "lucide-react";

interface Manager {
  id: string;
  name: string | null;
  email: string | null;
  role: "manager";
  created_at: string;
}

export default function ManagersPage() {
  const [managers, setManagers] = useState<Manager[]>([]);
  const [loading, setLoading] = useState(true);

  // Add dialog
  const [showAdd, setShowAdd] = useState(false);
  const [addName, setAddName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addPassword, setAddPassword] = useState("");
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState("");

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<Manager | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Reset password dialog
  const [resetTarget, setResetTarget] = useState<Manager | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  const fetchManagers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/managers");
      if (res.ok) {
        const data = await res.json();
        setManagers(data);
      }
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
    setAddLoading(true);
    try {
      const res = await fetch("/api/managers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: addName.trim(),
          email: addEmail.trim(),
          password: addPassword,
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
        toast.success(`${deleteTarget.name || "Manager"} has been removed`);
        setDeleteTarget(null);
        fetchManagers();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to delete manager.");
      }
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
    } finally {
      setResetLoading(false);
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
        title="Farm Managers"
        subtitle="Manage who can access the Primefield Farm Portal"
        actions={
          <Button onClick={() => setShowAdd(true)} size="sm">
            <Plus className="h-4 w-4 mr-1.5" />
            Add Manager
          </Button>
        }
      />

      <div className="flex-1 p-6 max-w-3xl">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-8">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading managers...
          </div>
        ) : managers.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-white p-10 text-center">
            <UserCircle2 className="h-10 w-10 mx-auto text-gray-300 mb-3" />
            <p className="text-sm font-medium text-gray-500">No managers yet</p>
            <p className="text-xs text-gray-400 mt-1">
              Add a manager so they can log in to the Farm Portal
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
            {managers.map((m) => (
              <div
                key={m.id}
                className="flex items-center gap-4 rounded-xl border border-gray-100 bg-white px-5 py-4 shadow-sm"
              >
                <div className="h-10 w-10 rounded-full bg-[#1B4332]/10 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-[#1B4332]">
                    {(m.name || m.email || "M")[0].toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {m.name || "—"}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{m.email}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Added {formatDate(m.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setResetTarget(m);
                      setNewPassword("");
                    }}
                    className="h-8 px-3 text-xs gap-1.5"
                  >
                    <KeyRound className="h-3.5 w-3.5" />
                    Reset Password
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setDeleteTarget(m)}
                    className="h-8 px-3 text-xs gap-1.5 text-red-500 hover:text-red-600 hover:border-red-200"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove
                  </Button>
                </div>
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
            Managers visit{" "}
            <span className="font-mono font-semibold">
              farm.ultratidycleaning.com
            </span>{" "}
            and sign in with their email and password. Share the credentials
            securely — they cannot see or delete historical data.
          </p>
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
            setAddError("");
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Farm Manager</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
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
              <Input
                id="m-password"
                type="password"
                placeholder="e.g. Primefield1"
                value={addPassword}
                onChange={(e) => setAddPassword(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Min. 8 characters, one uppercase letter, one number. Share
                securely with the manager.
              </p>
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
            <AlertDialogTitle>Remove manager?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{" "}
              <strong>{deleteTarget?.name || deleteTarget?.email}</strong>&apos;s
              account. They will no longer be able to log in to the Farm Portal.
              Their past entries will not be affected.
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
                "Yes, Remove"
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
