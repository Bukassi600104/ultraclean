import {managerRpc} from "@/lib/manager-write-api";
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/auth";
import { isTechnicalMessage } from "@/lib/record-display";

type WriteOptions = { id?: string; reason?: string; requestId?: string };
export type FarmWriteError = { message: string; code?: string };

/** Actor comes from verified authentication, never from request JSON. */
export async function farmWrite(profile: Profile, kind: string, operation: string, payload: unknown, options: WriteOptions = {}) {
  const supabase = createServerClient();
  if (!supabase) return { data: null, error: { message: "Database not configured", code: "503" } };
  return managerRpc(supabase,"farm_v2_write", {
    p_actor: profile.id, p_kind: kind, p_operation: operation, p_payload: payload,
    p_id: options.id ?? null, p_reason: options.reason ?? null,
    p_request_id: options.requestId ?? null,
  });
}

export function farmErrorResponse(error: FarmWriteError) {
  const status = error.code === "42501" ? 403 : error.code === "P0002" ? 404
    : ["23514", "23505", "40001"].includes(error.code ?? "") ? 409
    : ["22023", "22P02", "22007", "22008", "23502"].includes(error.code ?? "") ? 400
    : error.code === "503" ? 503 : 500;
  const nativeMessages: Record<string, string> = {
    "22P02": "Check the information entered and select the item again before saving.",
    "22007": "Enter a valid date and try again.",
    "22008": "Enter a valid date and try again.",
    "23502": "Complete the required fields before saving.",
    "23505": "This entry already exists. Refresh the records before trying again.",
  };
  const fallback = status === 403 ? "You do not have permission to make this change. Please contact Bimbo."
    : status === 409 ? "This entry could not be saved. Refresh the record, check its details and try again."
    : "We could not save this entry. Check the details and try again.";
  const message = status === 500 || status === 503 ? "Farm operation unavailable. Please try again."
    : nativeMessages[error.code || ""] || (isTechnicalMessage(error.message) ? fallback : error.message);
  return NextResponse.json({ error: message, code: error.code }, { status });
}
