"use client";

import { ReactNode } from "react";
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

      <button
        type="submit"
        disabled={isLoading}
        className="w-full h-14 rounded-xl text-lg font-semibold text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-60"
        style={{
          backgroundColor: isSuccess ? "#11d469" : "#1B4332",
        }}
      >
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : isSuccess ? (
          <CheckCircle className="h-5 w-5" />
        ) : null}
        {isSuccess ? "Saved!" : isLoading ? "Saving..." : submitLabel}
      </button>
    </form>
  );
}
