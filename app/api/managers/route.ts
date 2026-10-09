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
    return { ...profile, access_removed: auth.user.app_metadata?.manager_access_removed === true };
  })).catch(() => null);
  if (!accounts) return NextResponse.json({ error: "Unable to load account status. Please retry." }, { status: 503 });
  return NextResponse.json(accounts, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
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

  const { email, password, name, role } = parsed.data;

  const { data: authData, error: authError } =
    await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

  if (authError) {
    const status = authError.message.includes("already") ? 409 : 500;
    return NextResponse.json({ error: authError.message }, { status });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .update({ role, name, suspended: false })
    .eq("id", authData.user.id)
    .select()
    .single();

  if (profileError) {
    const { error: cleanupError } = await supabase.auth.admin.deleteUser(authData.user.id);
    return NextResponse.json(
      { error: cleanupError ? "Account setup failed; contact support before retrying." : "Account setup failed. Please retry." },
      { status: 500 }
    );
  }

  return NextResponse.json(profile, { status: 201 });
}
