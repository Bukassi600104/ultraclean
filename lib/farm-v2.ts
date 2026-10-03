import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/auth";

type WriteOptions = { id?: string; reason?: string; requestId?: string };
export type FarmWriteError = { message: string; code?: string };

/** Actor comes from verified authentication, never from request JSON. */
export async function farmWrite(profile: Profile, kind: string, operation: string, payload: unknown, options: WriteOptions = {}) {
  const supabase = createServerClient();
  if (!supabase) return { data: null, error: { message: "Database not configured", code: "503" } };
  return supabase.rpc("farm_v2_write", {
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
  const message = status === 500 ? "Farm operation unavailable. Please try again." : error.message;
  return NextResponse.json({ error: message, code: error.code }, { status });
}
