import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { managerCreateSchema } from "@/lib/validations";
import { managerRoles } from "@/lib/manager-accounts";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 503 }
    );
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, name, email, role, created_at, suspended")
    .in("role", [...managerRoles])
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const accounts = await Promise.all((data || []).map(async (profile) => {
    const { data: auth, error: authError } = await supabase.auth.admin.getUserById(profile.id);
    if (authError || !auth.user) throw new Error("Account status unavailable");
    return { ...profile, suspended:profile.suspended||auth.user.app_metadata?.manager_setup_pending===true,setup_pending:auth.user.app_metadata?.manager_setup_pending===true,access_removed: auth.user.app_metadata?.manager_access_removed === true };
  })).catch(() => null);
  if (!accounts) return NextResponse.json({ error: "Unable to load account status. Please retry." }, { status: 503 });
  return NextResponse.json(accounts, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  let actor;
  try {
    actor=await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 503 }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = managerCreateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const { email, password, name, role,starts_on } = parsed.data;
  const {data:ready,error:releaseError}=await supabase.rpc("manager_release_status",{p_actor:actor.id});
  if(releaseError||!ready)return NextResponse.json({error:"New account setup is temporarily paused. Please retry shortly."},{status:503});

  const { data: authData, error: authError } =
    await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      ban_duration:"876000h",
      app_metadata:{manager_setup_pending:true},
    });

  if (authError) {
    const status = authError.message.includes("already") ? 409 : 500;
    return NextResponse.json({ error: authError.message }, { status });
  }

  const { data: profile, error: profileError } = await supabase.rpc("manager_account_provision",{
    p_actor:actor.id,p_id:authData.user.id,p_role:role,p_name:name,p_starts_on:starts_on,
  });

  if (profileError) {
    const { error: cleanupError } = await supabase.auth.admin.deleteUser(authData.user.id);
    return NextResponse.json(
      { error: cleanupError ? "Account setup failed; contact support before retrying." : "Account setup failed. Please retry." },
      { status: 500 }
    );
  }
  const {error:enableError}=await supabase.auth.admin.updateUserById(authData.user.id,{ban_duration:"none",app_metadata:{...authData.user.app_metadata,manager_setup_pending:false}});
  if(enableError)return NextResponse.json({error:"The new account is saved but remains locked. Use Reactivate to finish setup."},{status:503});
  return NextResponse.json(profile, { status: 201 });
}
