import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import { changeUsernameSchema } from "@/lib/validations";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const profile = await requireAdmin();

    const body = await request.json();
    const parsed = changeUsernameSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { newUsername } = parsed.data;

    const supabase = createServerClient();
    if (!supabase) {
      return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
    }

    // Reject if same as current username
    if (profile.name?.toLowerCase() === newUsername.toLowerCase()) {
      return NextResponse.json(
        { error: "New username must be different from current username" },
        { status: 400 }
      );
    }

    // Check if new username was previously used (by anyone)
    const { data: usedEntry } = await supabase
      .from("used_usernames")
      .select("username")
      .ilike("username", newUsername)
      .maybeSingle();

    if (usedEntry) {
      return NextResponse.json(
        { error: "That username has already been used and cannot be claimed again" },
        { status: 409 }
      );
    }

    // Check uniqueness in active profiles (case-insensitive)
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .ilike("name", newUsername)
      .neq("id", profile.id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "That username is already taken" },
        { status: 409 }
      );
    }

    // Archive old username before updating
    if (profile.name) {
      await supabase.from("used_usernames").insert({
        username: profile.name,
        used_by: profile.id,
      });
    }

    // Update the username
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ name: newUsername })
      .eq("id", profile.id);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to update username" },
        { status: 500 }
      );
    }

    return NextResponse.json({ username: newUsername });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
