"use client";

import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle } from "lucide-react";

interface FarmFormProps {
  children: ReactNode;
  onSubmit: (e: React.FormEvent) => void;
  isLoading: boolean;
  isSuccess: boolean;
  submitLabel?: string;
}

export function FarmForm({
  children,
  onSubmit,
  isLoading,
  isSuccess,
  submitLabel = "Submit",
}: FarmFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-5 px-4 pb-24">
      {children}

      <Button
        type="submit"
        disabled={isLoading}
        className="w-full h-14 text-lg font-semibold"
      >
        {isLoading ? (
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        ) : isSuccess ? (
          <CheckCircle className="mr-2 h-5 w-5" />
        ) : null}
        {isSuccess ? "Saved!" : isLoading ? "Saving..." : submitLabel}
      </Button>
    </form>
  );
}
