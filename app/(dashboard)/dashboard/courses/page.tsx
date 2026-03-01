"use client";

import { useState } from "react";
import {
  GraduationCap,
  Link2,
  Copy,
  Check,
  ExternalLink,
  Users,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";

export default function CoursesPage() {
  const [copied, setCopied] = useState(false);

  const siteUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://ultratidy.vercel.app";

  const registrationLink = `${siteUrl}/register`;

  async function handleCopy() {
    await navigator.clipboard.writeText(registrationLink);
    setCopied(true);
    toast.success("Registration link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <DashboardHeader title="DBA Courses" />
      <div className="p-4 lg:p-8 space-y-6 max-w-3xl">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-heading font-bold flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-primary" />
            Course Registration
          </h1>
          <p className="text-muted-foreground mt-1">
            Share this link with prospective students. When they register their
            interest, their details appear automatically in{" "}
            <strong>Leads → DBA</strong>.
          </p>
        </div>

        {/* Registration Link Card */}
        <div className="rounded-xl border bg-card p-6 space-y-4">
          <h2 className="font-heading font-semibold text-lg flex items-center gap-2">
            <Link2 className="h-5 w-5 text-primary" />
            Your Registration Link
          </h2>

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
            Share this link on WhatsApp, Instagram, Facebook, or email. Students
            fill in their name, email, and phone — no payment required at this
            stage.
          </p>
        </div>

        {/* How It Works */}
        <div className="rounded-xl border bg-card p-6">
          <h2 className="font-heading font-semibold text-lg mb-4">
            How It Works
          </h2>
          <ol className="space-y-4 text-sm text-muted-foreground">
            <li className="flex gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                1
              </span>
              <span className="pt-0.5">
                Share the registration link on social media or directly with
                prospective students.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                2
              </span>
              <span className="pt-0.5">
                Students fill in their name, email, phone, and optionally a
                message about their goals.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                3
              </span>
              <span className="pt-0.5">
                Their details appear instantly in{" "}
                <strong className="text-foreground">Leads</strong> under the{" "}
                <strong className="text-foreground">DBA</strong> business
                filter.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                4
              </span>
              <span className="pt-0.5">
                Follow up with each student to confirm enrollment, share payment
                details, and onboard them into the course.
              </span>
            </li>
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
