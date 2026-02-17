import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

// GET — single appointment
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 503 }
    );
  }

  const { data, error } = await supabase
    .from("appointments")
    .select("*")
    .eq("id", params.id)
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Appointment not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ data });
}

// PUT — update appointment (admin: status changes, etc.)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 503 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("appointments")
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq("id", params.id)
    .select()
    .single();

  if (error) {
    console.error("Failed to update appointment:", error);
    return NextResponse.json(
      { error: "Failed to update appointment" },
      { status: 500 }
    );
  }

  return NextResponse.json({ data });
}

// DELETE — delete appointment (admin)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Database not configured" },
      { status: 503 }
    );
  }

  const { error } = await supabase
    .from("appointments")
    .delete()
    .eq("id", params.id);

  if (error) {
    console.error("Failed to delete appointment:", error);
    return NextResponse.json(
      { error: "Failed to delete appointment" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
