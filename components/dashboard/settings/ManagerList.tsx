"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  UserPlus,
  Trash2,
  KeyRound,
  Eye,
  EyeOff,
  Loader2,
  Shuffle,
} from "lucide-react";
import { managerCreateSchema, managerResetPasswordSchema } from "@/lib/validations";
import type { Profile } from "@/types";

type CreateValues = { name: string; email: string; password: string };
type ResetValues = { password: string };

function generatePassword(length = 14): string {
  const chars =
    "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%";
  const arr = new Uint8Array(length);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => chars[b % chars.length]).join("");
}

export function ManagerList() {
  const [managers, setManagers] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Profile | null>(null);
  const [resetTarget, setResetTarget] = useState<Profile | null>(null);

  const fetchManagers = useCallback(async () => {
    try {
      const res = await fetch("/api/managers");
      if (res.ok) {
        setManagers(await res.json());
      }
    } catch {
      toast.error("Failed to load managers");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchManagers();
  }, [fetchManagers]);

  // ── Create dialog ──
  const createForm = useForm<CreateValues>({
    resolver: zodResolver(managerCreateSchema),
    defaultValues: { name: "", email: "", password: "" },
  });
  const [showCreatePw, setShowCreatePw] = useState(false);

  async function handleCreate(data: CreateValues) {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/managers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.status === 409) {
        toast.error("A user with this email already exists");
        return;
      }
      if (!res.ok) throw new Error();
      toast.success("Manager account created");
      setShowCreate(false);
      createForm.reset();
      fetchManagers();
    } catch {
      toast.error("Failed to create manager");
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── Delete handler ──
  async function handleDelete() {
    if (!deleteTarget) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/managers/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      toast.success("Manager account deleted");
      setDeleteTarget(null);
      fetchManagers();
    } catch {
      toast.error("Failed to delete manager");
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── Reset password dialog ──
  const resetForm = useForm<ResetValues>({
    resolver: zodResolver(managerResetPasswordSchema),
    defaultValues: { password: "" },
  });
  const [showResetPw, setShowResetPw] = useState(false);

  async function handleReset(data: ResetValues) {
    if (!resetTarget) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/managers/${resetTarget.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: data.password }),
      });
      if (!res.ok) throw new Error();
      toast.success("Password updated successfully");
      setResetTarget(null);
      resetForm.reset();
    } catch {
      toast.error("Failed to reset password");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-base">Team Management</CardTitle>
            <CardDescription className="text-sm text-gray-500 mt-1">
              Manage farm manager accounts and access
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {managers.length >= 1 && (
              <span className="text-xs text-gray-400">Max 1 manager</span>
            )}
            <Button
              size="sm"
              disabled={managers.length >= 1}
              onClick={() => {
                createForm.reset();
                setShowCreatePw(false);
                setShowCreate(true);
              }}
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Add Manager
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : managers.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-6">
              No manager accounts yet. Click &quot;Add Manager&quot; to create
              one.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="hidden sm:table-cell">
                    Created
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {managers.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">
                      {m.name || "—"}
                    </TableCell>
                    <TableCell className="text-gray-500">{m.email}</TableCell>
                    <TableCell className="hidden sm:table-cell text-gray-500">
                      {new Date(m.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Reset password"
                          onClick={() => {
                            resetForm.reset();
                            setShowResetPw(false);
                            setResetTarget(m);
                          }}
                        >
                          <KeyRound className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Delete manager"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(m)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ── Create Manager Dialog ── */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Manager</DialogTitle>
            <DialogDescription>
              Create a new farm manager account. They&apos;ll use these
              credentials to log in to the Farm Manager Portal.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={createForm.handleSubmit(handleCreate)}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="mgr-name">Name</Label>
              <Input
                id="mgr-name"
                placeholder="e.g. Farm Manager"
                {...createForm.register("name")}
              />
              {createForm.formState.errors.name && (
                <p className="text-xs text-destructive">
                  {createForm.formState.errors.name.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="mgr-email">Email</Label>
              <Input
                id="mgr-email"
                type="email"
                placeholder="manager@example.com"
                {...createForm.register("email")}
              />
              {createForm.formState.errors.email && (
                <p className="text-xs text-destructive">
                  {createForm.formState.errors.email.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="mgr-password">Password</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="mgr-password"
                    type={showCreatePw ? "text" : "password"}
                    placeholder="Min 8 chars, 1 uppercase, 1 number"
                    {...createForm.register("password")}
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    onClick={() => setShowCreatePw(!showCreatePw)}
                    tabIndex={-1}
                  >
                    {showCreatePw ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  title="Generate password"
                  onClick={() => {
                    const pw = generatePassword();
                    createForm.setValue("password", pw, {
                      shouldValidate: true,
                    });
                    setShowCreatePw(true);
                  }}
                >
                  <Shuffle className="h-4 w-4" />
                </Button>
              </div>
              {createForm.formState.errors.password && (
                <p className="text-xs text-destructive">
                  {createForm.formState.errors.password.message}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Manager"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ── */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete manager account?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{" "}
              <span className="font-medium text-gray-900">
                {deleteTarget?.name || deleteTarget?.email}
              </span>
              &apos;s account. They will no longer be able to log in to the Farm
              Manager Portal. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Reset Password Dialog ── */}
      <Dialog
        open={!!resetTarget}
        onOpenChange={(open) => !open && setResetTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Set a new password for{" "}
              <span className="font-medium">
                {resetTarget?.name || resetTarget?.email}
              </span>
              . Share the new password with them securely.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={resetForm.handleSubmit(handleReset)}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="reset-password">New Password</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="reset-password"
                    type={showResetPw ? "text" : "password"}
                    placeholder="Min 8 chars, 1 uppercase, 1 number"
                    {...resetForm.register("password")}
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    onClick={() => setShowResetPw(!showResetPw)}
                    tabIndex={-1}
                  >
                    {showResetPw ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  title="Generate password"
                  onClick={() => {
                    const pw = generatePassword();
                    resetForm.setValue("password", pw, {
                      shouldValidate: true,
                    });
                    setShowResetPw(true);
                  }}
                >
                  <Shuffle className="h-4 w-4" />
                </Button>
              </div>
              {resetForm.formState.errors.password && (
                <p className="text-xs text-destructive">
                  {resetForm.formState.errors.password.message}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Password"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
