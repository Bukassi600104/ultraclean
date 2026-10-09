import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { managerUpdateSchema } from "@/lib/validations";
import { isManagerRole } from "@/lib/manager-accounts";

export const runtime = "nodejs";
const fail = (error: string, status: number) => NextResponse.json({ error }, { status });
const banDuration = "876000h";

async function account(id: string) {
  let actor;
  try { actor = await requireAdmin(); } catch { return { response: fail("Unauthorized", 401) }; }
  const supabase = createServerClient();
  if (!supabase) return { response: fail("Database not configured", 503) };
  const { data: target, error } = await supabase.from("profiles").select("id, role, name, suspended").eq("id", id).single();
  if (error) return { response: fail("Unable to load account", 503) };
  if (!target) return { response: fail("Account not found", 404) };
  if (!isManagerRole(target.role) || id === actor.id) return { response: fail("Only staff accounts can be managed here", 403) };
  const { data: auth, error: authError } = await supabase.auth.admin.getUserById(id);
  if (authError || !auth.user) return { response: fail("Unable to load account status", 503) };
  return { supabase, actor, target, user: auth.user };
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const context = await account(params.id);
  if (context.response) return context.response;
  const { supabase, actor, user } = context;
  // Keep identity and profile: deleting either would break historical attribution.
  const { error } = await supabase.from("profiles").update({ suspended: true }).eq("id", params.id);
  if (error) return fail("Unable to remove access. Please retry.", 503);
  const metadata = user.app_metadata || {};
  const { error: authError } = await supabase.auth.admin.updateUserById(params.id, {
    ban_duration: banDuration,
    app_metadata: { ...metadata, manager_access_removed: true,
      manager_access_removed_at: metadata.manager_access_removed_at || new Date().toISOString(),
      manager_access_removed_by: metadata.manager_access_removed_by || actor.id },
  });
  if (authError) return fail("Account is suspended, but removal did not finish. Please retry Remove access.", 503);
  return NextResponse.json({ success: true });
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const context = await account(params.id);
  if (context.response) return context.response;
  const { supabase, user } = context;
  const parsed = managerUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("Validation failed", 400);
  if (user.app_metadata?.manager_access_removed === true) return fail("Access has been removed. Create a separate account for new access.", 409);
  const changes = parsed.data;
  if (changes.suspended === true) {
    const { error } = await supabase.from("profiles").update({ suspended: true }).eq("id", params.id);
    if (error) return fail("Unable to suspend account", 503);
  }
  if (changes.password || changes.suspended !== undefined) {
    const { error } = await supabase.auth.admin.updateUserById(params.id, {
      ...(changes.password ? { password: changes.password } : {}),
      ...(changes.suspended !== undefined ? { ban_duration: changes.suspended ? banDuration : "none" } : {}),
    });
    if (error) return fail(changes.suspended === true ? "Account remains suspended, but the sign-in restriction did not finish. Please retry." : "Account update did not finish. Please retry.", 503);
  }
  const profileChanges = { ...(changes.name ? { name: changes.name } : {}),
    ...(changes.suspended !== undefined ? { suspended: changes.suspended } : {}) };
  if (Object.keys(profileChanges).length) {
    if (changes.suspended === false) {
      const { data: latest, error } = await supabase.auth.admin.getUserById(params.id);
      if (error || !latest.user) return fail("Unable to verify account status", 503);
      if (latest.user.app_metadata?.manager_access_removed === true) return fail("Access has been removed", 409);
    }
    const { error } = await supabase.from("profiles").update(profileChanges).eq("id", params.id);
    if (error) return fail("Unable to save account details. Please retry.", 503);
  }
  const { data: profile, error } = await supabase.from("profiles").select("id, name, email, role, created_at, suspended").eq("id", params.id).single();
  if (error) return fail("Unable to load updated account. Please refresh.", 503);
  return NextResponse.json({ ...profile, access_removed: false });
}
