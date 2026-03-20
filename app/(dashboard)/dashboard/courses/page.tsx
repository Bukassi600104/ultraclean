"use client";

import { useState, useEffect } from "react";
import {
  GraduationCap,
  Link2,
  Copy,
  Check,
  ExternalLink,
  Users,
  BookOpen,
  PencilLine,
  DollarSign,
  Loader2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";

interface CourseSettings {
  course_name: string;
  price_cents: number;
  currency: string;
  stripe_payment_link?: string;
}

function formatPrice(cents: number, currency: string) {
  return (cents / 100).toLocaleString("en-CA", {
    style: "currency",
    currency: currency.toUpperCase(),
  });
}

export default function CoursesPage() {
  const [copied, setCopied] = useState(false);
  const [settings, setSettings] = useState<CourseSettings | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);

  // Edit state
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editLink, setEditLink] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const registrationLink =
    typeof window !== "undefined"
      ? `${window.location.origin.replace("leads.", "register.")}/register`
      : "https://register.ultratidycleaning.com";

  useEffect(() => {
    fetch("/api/courses/settings")
      .then((r) => r.json())
      .then((data) => {
        setSettings(data);
        setLoadingSettings(false);
      })
      .catch(() => setLoadingSettings(false));
  }, []);

  function openEdit() {
    if (!settings) return;
    setEditName(settings.course_name);
    setEditPrice((settings.price_cents / 100).toFixed(2));
    setEditLink(settings.stripe_payment_link || "");
    setSaveError("");
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setSaveError("");
  }

  async function handleSave() {
    setSaveError("");
    const priceNum = parseFloat(editPrice);
    if (!editName.trim()) {
      setSaveError("Course name cannot be empty.");
      return;
    }
    if (isNaN(priceNum) || priceNum <= 0) {
      setSaveError("Enter a valid price greater than $0.");
      return;
    }

    const price_cents = Math.round(priceNum * 100);
    setSaving(true);
    try {
      const res = await fetch("/api/courses/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          course_name: editName.trim(),
          price_cents,
          currency: settings?.currency || "usd",
          stripe_payment_link: editLink.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveError(data.error || "Failed to save. Please try again.");
        return;
      }
      setSettings(data);
      setEditing(false);
      toast.success("Course settings updated!");
    } catch {
      setSaveError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(registrationLink);
    setCopied(true);
    toast.success("Registration link copied!");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <DashboardHeader title="DBA Courses" />
      <div className="p-4 lg:p-8 space-y-6 max-w-3xl">

        {/* Course Settings Card */}
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/30">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              <h2 className="font-heading font-semibold text-base">
                Active Course
              </h2>
            </div>
            {!editing && (
              <Button
                variant="outline"
                size="sm"
                onClick={openEdit}
                disabled={loadingSettings}
                className="gap-1.5"
              >
                <PencilLine className="h-3.5 w-3.5" />
                Edit
              </Button>
            )}
          </div>

          <div className="px-6 py-5">
            {loadingSettings ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading course settings...
              </div>
            ) : editing ? (
              /* ── Edit form ── */
              <div className="space-y-4">
                {saveError && (
                  <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
                    {saveError}
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="c-name">Course Name</Label>
                  <Input
                    id="c-name"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="e.g. Digital Boss Academy — Business Starter"
                  />
                  <p className="text-xs text-muted-foreground">
                    This name appears on the Stripe payment page and receipt.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="c-price">Price (USD $)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="c-price"
                      type="number"
                      min="1"
                      step="0.01"
                      value={editPrice}
                      onChange={(e) => setEditPrice(e.target.value)}
                      placeholder="20.00"
                      className="pl-9"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This must match the price set in your Stripe payment link.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="c-link">Stripe Payment Link</Label>
                  <Input
                    id="c-link"
                    type="url"
                    value={editLink}
                    onChange={(e) => setEditLink(e.target.value)}
                    placeholder="https://buy.stripe.com/..."
                  />
                  <p className="text-xs text-muted-foreground">
                    Paste the Stripe payment link. Students are sent here after registering.
                  </p>
                </div>
                <div className="flex items-center gap-3 pt-1">
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Saving...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={cancelEdit}
                    disabled={saving}
                    className="gap-1.5"
                  >
                    <X className="h-4 w-4" />
                    Cancel
                  </Button>
                </div>
              </div>
            ) : settings ? (
              /* ── Display mode ── */
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <GraduationCap className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-lg font-semibold text-gray-900 leading-tight">
                    {settings.course_name}
                  </p>
                  <p className="text-2xl font-bold text-primary mt-1">
                    {formatPrice(settings.price_cents, settings.currency)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    This price is what students pay on the Stripe checkout page.
                  </p>
                  {settings.stripe_payment_link && (
                    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
                      <Link2 className="h-3 w-3 shrink-0" />
                      <a
                        href={settings.stripe_payment_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline truncate"
                      >
                        {settings.stripe_payment_link}
                      </a>
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Could not load course settings.
              </p>
            )}
          </div>
        </div>

        {/* Registration Link Card */}
        <div className="rounded-xl border bg-card p-6 space-y-4">
          <h2 className="font-heading font-semibold text-lg flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" />
            Registration Link
          </h2>
          <div className="flex items-center gap-2">
            <div className="flex-1 min-w-0 rounded-lg bg-muted/50 border px-4 py-3 font-mono text-sm break-all">
              https://register.ultratidycleaning.com
            </div>
            <Button
              variant="outline"
              size="icon"
              className="shrink-0 h-11 w-11"
              onClick={handleCopy}
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" asChild>
              <a
                href="https://register.ultratidycleaning.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Preview Page
              </a>
            </Button>
            <Button size="sm" onClick={handleCopy}>
              <Copy className="h-3.5 w-3.5 mr-2" />
              Copy Link
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Share on WhatsApp, Instagram, Facebook, or email. Students register
            their interest and are automatically directed to pay via Stripe.
          </p>
        </div>

        {/* How It Works */}
        <div className="rounded-xl border bg-card p-6">
          <h2 className="font-heading font-semibold text-lg mb-4">
            How It Works
          </h2>
          <ol className="space-y-4 text-sm text-muted-foreground">
            {[
              "Share the registration link on social media or directly with prospective students.",
              "Students fill in their name, email, and phone number.",
              'They click "Proceed to Payment" and pay via Stripe — the price shown is whatever you set above.',
              "Their details appear instantly in Leads under the DBA filter, and they receive a confirmation email.",
            ].map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                  {i + 1}
                </span>
                <span className="pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-xl border bg-card p-5 flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-sm">View Student Leads</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                See all DBA registrations in the leads CRM.
              </p>
              <a
                href="/dashboard/leads?business=dba"
                className="text-xs text-primary hover:underline mt-2 inline-block"
              >
                Go to Leads →
              </a>
            </div>
          </div>
          <div className="rounded-xl border bg-card p-5 flex items-start gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-sm">DBA Products & Sales</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Manage DBA courses, ebooks, and log sales manually.
              </p>
              <a
                href="/dashboard/dba"
                className="text-xs text-primary hover:underline mt-2 inline-block"
              >
                Go to DBA Products →
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
