import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import { z } from "zod";

const changeEmailSchema = z.object({
  newEmail: z.string().email("Please enter a valid email address"),
  currentPassword: z.string().min(1, "Current password is required"),
});

export async function POST(request: Request) {
  try {
    const profile = await getCurrentUser();
    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = changeEmailSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { newEmail, currentPassword } = parsed.data;

    const supabase = createServerClient();
    if (!supabase) {
      return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
    }

    // Verify current password
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: profile.email!,
      password: currentPassword,
    });

    if (signInError) {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 400 }
      );
    }

    // Update email via admin API
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      profile.id,
      { email: newEmail, email_confirm: true }
    );

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message || "Failed to update email" },
        { status: 500 }
      );
    }

    // Also update email in profiles table
    await supabase
      .from("profiles")
      .update({ email: newEmail })
      .eq("id", profile.id);

    return NextResponse.json({ message: "Email updated successfully" });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
