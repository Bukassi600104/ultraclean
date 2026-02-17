"use client";

import { useState, useEffect } from "react";
import {
  GraduationCap,
  Link2,
  Copy,
  Check,
  ExternalLink,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const STORAGE_KEY = "dba_course_config";

interface CourseConfig {
  registrationUrl: string;
  priceId: string;
}

function getConfig(): CourseConfig {
  if (typeof window === "undefined") return { registrationUrl: "", priceId: "" };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { registrationUrl: "", priceId: "" };
}

function saveConfig(config: CourseConfig) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

export default function CoursesPage() {
  const [config, setConfig] = useState<CourseConfig>({
    registrationUrl: "",
    priceId: "",
  });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setConfig(getConfig());
  }, []);

  const fullLink =
    config.registrationUrl && config.priceId
      ? `${config.registrationUrl.replace(/\/+$/, "")}/?price=${config.priceId}`
      : "";

  const isValidPrice = /^price_[a-zA-Z0-9]{8,}$/.test(config.priceId);
  const isValidUrl =
    config.registrationUrl.startsWith("http://") ||
    config.registrationUrl.startsWith("https://");

  function handleSave() {
    saveConfig(config);
    toast.success("Course registration settings saved.");
  }

  async function handleCopy() {
    if (!fullLink) return;
    await navigator.clipboard.writeText(fullLink);
    setCopied(true);
    toast.success("Registration link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
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
          Set your Stripe Price ID and registration app URL. Share the generated
          link with students to register and pay.
        </p>
      </div>

      {/* Settings Card */}
      <div className="rounded-xl border bg-card p-6 max-w-2xl space-y-6">
        <h2 className="font-heading font-semibold text-lg">Settings</h2>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="registrationUrl">Registration App URL</Label>
            <Input
              id="registrationUrl"
              type="url"
              placeholder="https://register.yourdomain.com"
              value={config.registrationUrl}
              onChange={(e) =>
                setConfig((c) => ({ ...c, registrationUrl: e.target.value }))
              }
            />
            <p className="text-xs text-muted-foreground">
              The base URL where the Billing registration app is deployed.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="priceId">Stripe Price ID</Label>
            <Input
              id="priceId"
              type="text"
              placeholder="price_1Abc2Def3Ghi4Jkl"
              value={config.priceId}
              onChange={(e) =>
                setConfig((c) => ({ ...c, priceId: e.target.value }))
              }
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
              under the product&apos;s price section.
            </p>
          </div>

          <Button onClick={handleSave} className="mt-2">
            Save Settings
          </Button>
        </div>
      </div>

      {/* Generated Link Card */}
      <div className="rounded-xl border bg-card p-6 max-w-2xl space-y-4">
        <h2 className="font-heading font-semibold text-lg flex items-center gap-2">
          <Link2 className="h-5 w-5 text-primary" />
          Registration Link
        </h2>

        {fullLink && isValidUrl && isValidPrice ? (
          <>
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0 rounded-lg bg-muted/50 border px-4 py-3 font-mono text-sm break-all">
                {fullLink}
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
              <Button
                variant="outline"
                size="sm"
                asChild
              >
                <a
                  href={fullLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Preview Link
                </a>
              </Button>
              <Button size="sm" onClick={handleCopy}>
                <Copy className="h-3.5 w-3.5 mr-2" />
                Copy Link
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Share this link on social media, email, or your website. Students
              will fill in their info and be redirected to Stripe to pay.
            </p>
          </>
        ) : (
          <div className="flex items-start gap-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 px-4 py-3">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-amber-800 dark:text-amber-200">
                Complete the settings above
              </p>
              <p className="text-amber-700 dark:text-amber-300 mt-0.5">
                Enter a valid Registration App URL and Stripe Price ID to
                generate your registration link.
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
              Copy the Price ID (starts with <code className="text-xs bg-muted px-1 py-0.5 rounded">price_</code>) and paste it above.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
              3
            </span>
            <span>
              Share the generated registration link with your students.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
              4
            </span>
            <span>
              When a student pays, you&apos;ll get an email notification with their details.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
              5
            </span>
            <span>
              For a new course, just create a new Stripe product/price and
              update the Price ID here. Same link format, new course!
            </span>
          </li>
        </ol>
      </div>
    </div>
  );
}
