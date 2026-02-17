"use client";

import { useState, useEffect } from "react";
import {
  GraduationCap,
  Link2,
  Copy,
  Check,
  ExternalLink,
  AlertCircle,
  Loader2,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function CoursesPage() {
  const [priceId, setPriceId] = useState("");
  const [savedPriceId, setSavedPriceId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const siteUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://ultratidy.vercel.app";

  const registrationLink = `${siteUrl}/register`;

  useEffect(() => {
    fetch("/api/courses/settings")
      .then((res) => res.json())
      .then((data) => {
        const id = data.stripe_price_id || "";
        setPriceId(id);
        setSavedPriceId(id);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const isValidPrice = /^price_[a-zA-Z0-9]{8,}$/.test(priceId);
  const hasChanges = priceId !== savedPriceId;

  async function handleSave() {
    if (!isValidPrice && priceId.trim() !== "") {
      toast.error("Invalid Price ID format. It should start with 'price_'");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/courses/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stripe_price_id: priceId.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to save settings");
        return;
      }

      setSavedPriceId(priceId.trim());
      toast.success("Course registration settings saved.");
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(registrationLink);
    setCopied(true);
    toast.success("Registration link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
          <GraduationCap className="h-6 w-6 text-primary" />
          Course Registration
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage your Digital Boss Academy course registration. Set a Stripe
          Price ID and share the registration link with students.
        </p>
      </div>

      {/* Settings Card */}
      <div className="rounded-xl border bg-card p-6 max-w-2xl space-y-6">
        <h2 className="font-heading font-semibold text-lg">Settings</h2>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="priceId">Stripe Price ID</Label>
            <Input
              id="priceId"
              type="text"
              placeholder="price_1Abc2Def3Ghi4Jkl"
              value={priceId}
              onChange={(e) => setPriceId(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Find this in your{" "}
              <a
                href="https://dashboard.stripe.com/products"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Stripe Dashboard
              </a>{" "}
              under the product&apos;s price section. When set, the registration
              page will accept payments for this price.
            </p>
          </div>

          {priceId && !isValidPrice && (
            <div className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                Price ID should start with{" "}
                <code className="text-xs bg-amber-100 dark:bg-amber-900 px-1 py-0.5 rounded">
                  price_
                </code>{" "}
                followed by at least 8 characters.
              </span>
            </div>
          )}

          <Button
            onClick={handleSave}
            disabled={saving || (!hasChanges && savedPriceId === priceId)}
            className="mt-2"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Settings
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Registration Link Card */}
      <div className="rounded-xl border bg-card p-6 max-w-2xl space-y-4">
        <h2 className="font-heading font-semibold text-lg flex items-center gap-2">
          <Link2 className="h-5 w-5 text-primary" />
          Registration Link
        </h2>

        {savedPriceId && isValidPrice ? (
          <>
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0 rounded-lg bg-muted/50 border px-4 py-3 font-mono text-sm break-all">
                {registrationLink}
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
                  href={registrationLink}
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
              Share this link on social media, email, or your website. Students
              will fill in their details and be redirected to Stripe to pay.
            </p>
          </>
        ) : (
          <div className="flex items-start gap-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 px-4 py-3">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-amber-800 dark:text-amber-200">
                Set a Stripe Price ID first
              </p>
              <p className="text-amber-700 dark:text-amber-300 mt-0.5">
                Enter and save a valid Stripe Price ID above to enable the
                registration page.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* How It Works */}
      <div className="rounded-xl border bg-card p-6 max-w-2xl">
        <h2 className="font-heading font-semibold text-lg mb-4">
          How It Works
        </h2>
        <ol className="space-y-3 text-sm text-muted-foreground">
          <li className="flex gap-3">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
              1
            </span>
            <span>
              Create a product and price in your{" "}
              <a
                href="https://dashboard.stripe.com/products"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Stripe Dashboard
              </a>
              .
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
              2
            </span>
            <span>
              Copy the Price ID (starts with{" "}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">
                price_
              </code>
              ) and paste it above, then save.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
              3
            </span>
            <span>
              Share the registration link with your students — they&apos;ll fill
              in their details and pay via Stripe.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
              4
            </span>
            <span>
              When a student pays, both you and the student receive an email
              confirmation automatically.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
              5
            </span>
            <span>
              For a new course, create a new Stripe product/price and update the
              Price ID here. The same registration link will work for the new
              course!
            </span>
          </li>
        </ol>
      </div>
    </div>
  );
}
