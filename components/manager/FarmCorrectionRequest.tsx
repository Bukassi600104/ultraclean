"use client";

import { useState } from "react";
import { toast } from "sonner";

export function FarmCorrectionRequest({ recordType, recordId, label = "Request correction" }: {
  recordType: string; recordId: string; label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [change, setChange] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [requestId, setRequestId] = useState("");
  async function submit() {
    if (!change.trim() || !reason.trim()) return toast.error("Describe the correction and its reason");
    setSaving(true);
    try {
      const response = await fetch("/api/farm/corrections", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ record_type: recordType, record_id: recordId, requested_change: { description: change.trim() }, reason: reason.trim(), request_id: requestId }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to send correction request");
      toast.success("Correction requested. Bimbo will review it.");
      setOpen(false); setChange(""); setReason("");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to send request"); }
    finally { setSaving(false); }
  }
  return <>
    <button type="button" onClick={() => { setRequestId(crypto.randomUUID()); setOpen(true); }} className="text-xs font-semibold text-blue-700 py-2">{label}</button>
    {open && <div className="fixed inset-0 z-50 flex items-center justify-center px-4" role="dialog" aria-modal="true" aria-label="Request correction">
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative bg-white rounded-2xl p-5 w-full max-w-sm space-y-3 text-left">
        <h2 className="font-bold text-gray-900">Request correction</h2>
        <p className="text-sm text-gray-600">Saved records stay unchanged until Bimbo reviews and applies the correction.</p>
        <label className="block text-sm">What should change?
          <textarea value={change} onChange={(event) => {setChange(event.target.value);setRequestId(crypto.randomUUID());}} maxLength={2000} className="mt-1 w-full border rounded-xl p-3" />
        </label>
        <label className="block text-sm">Reason
          <textarea value={reason} onChange={(event) => {setReason(event.target.value);setRequestId(crypto.randomUUID());}} maxLength={1000} className="mt-1 w-full border rounded-xl p-3" />
        </label>
        <div className="flex gap-2">
          <button type="button" disabled={saving} onClick={() => setOpen(false)} className="flex-1 border rounded-xl p-3">Cancel</button>
          <button type="button" disabled={saving} onClick={submit} className="flex-1 bg-green-900 text-white rounded-xl p-3">{saving ? "Sending..." : "Send request"}</button>
        </div>
      </div>
    </div>}
  </>;
}
