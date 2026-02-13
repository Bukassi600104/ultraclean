import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { managerUpdateSchema } from "@/lib/validations";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
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

  const { data: target } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", params.id)
    .single();

  if (!target || target.role !== "manager") {
    return NextResponse.json(
      { error: "User is not a manager" },
      { status: 403 }
    );
  }

  const { error } = await supabase.auth.admin.deleteUser(params.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

  const { data: target } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", params.id)
    .single();

  if (!target || target.role !== "manager") {
    return NextResponse.json(
      { error: "User is not a manager" },
      { status: 403 }
    );
  }

  const body = await request.json();
  const parsed = managerUpdateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        details: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  if (parsed.data.password) {
    const { error } = await supabase.auth.admin.updateUserById(params.id, {
      password: parsed.data.password,
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  if (parsed.data.name) {
    await supabase
      .from("profiles")
      .update({ name: parsed.data.name })
      .eq("id", params.id);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", params.id)
    .single();

  return NextResponse.json(profile);
}
