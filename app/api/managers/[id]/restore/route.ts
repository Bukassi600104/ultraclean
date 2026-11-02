import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import { isManagedStaffRole } from "@/lib/manager-accounts";

export const runtime = "nodejs";
const schema = z.object({ reason: z.string().trim().min(1).max(500), confirm_same_person: z.literal(true) }).strict();
const fail = (error: string, status: number) => NextResponse.json({ error }, { status });

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  let actor;
  try { actor = await requireAdmin(); } catch { return fail("Unauthorized", 401); }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("Confirm this is the same person and provide a reason of up to 500 characters.", 400);
  const supabase = createServerClient();
  if (!supabase) return fail("Database not configured", 503);
  const { data: target, error: profileError } = await supabase.from("profiles").select("id, role, suspended").eq("id", params.id).single();
  if (profileError) return fail("Unable to load account", 503);
  if (!target) return fail("Account not found", 404);
  if (!isManagedStaffRole(target.role) || target.id === actor.id) return fail("Only staff accounts can be restored here", 403);
  const { data: auth, error: authError } = await supabase.auth.admin.getUserById(params.id);
  if (authError || !auth.user) return fail("Unable to load account status", 503);
  const metadata = auth.user.app_metadata || {};
  const history = metadata.manager_access_restorations;
  if (history !== undefined && !Array.isArray(history)) return fail("Account restoration history needs review. No access was changed.", 409);
  if (metadata.manager_access_removed !== true) {
    if (Array.isArray(history) && history.length) return NextResponse.json({ success: true, already_restored: true, suspended: target.suspended, access_removed: false });
    return fail("This account has not had its access removed. Use Reactivate for a suspended account.", 409);
  }

  // Restoration never enables sign-in; the existing Reactivate action remains a separate decision.
  const { error: suspendError } = await supabase.from("profiles").update({ suspended: true }).eq("id", params.id);
  if (suspendError) return fail("Unable to secure the account for restoration. Please retry.", 503);
  // Keep an immutable intent even if concurrent Auth metadata updates replace the summary below.
  const { data: auditId, error: auditError } = await supabase.rpc("staff_restoration_audit", {
    p_actor: actor.id, p_target: params.id, p_reason: parsed.data.reason,
  });
  if (auditError || !auditId) return fail("The account remains suspended. Unable to record the restoration request; please retry.", 503);
  const { error: restoreError } = await supabase.auth.admin.updateUserById(params.id, {
    ban_duration: "876000h",
    app_metadata: {
      ...metadata,
      manager_access_removed: false,
      manager_access_restorations: [...(history || []), {
        audit_id: auditId,
        actor_id: actor.id,
        restored_at: new Date().toISOString(),
        reason: parsed.data.reason,
        confirmed_same_person: true,
        removed_at: metadata.manager_access_removed_at ?? null,
        removed_by: metadata.manager_access_removed_by ?? null,
      }],
    },
  });
  if (restoreError) return fail("The account remains suspended. Restoration did not finish; please retry.", 503);
  return NextResponse.json({ success: true, suspended: true, access_removed: false });
}
