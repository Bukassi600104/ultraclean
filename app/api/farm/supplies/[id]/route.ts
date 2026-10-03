import { NextRequest, NextResponse } from "next/server";
import { requireManager } from "@/lib/auth";
import { farmWrite, farmErrorResponse } from "@/lib/farm-v2";
import { z } from "zod";

export const runtime = "nodejs";
const updateSchema = z.object({
  item_name: z.string().trim().min(1).optional(),
  category: z.enum(["feed", "medication", "fuel", "equipment", "other"]).optional(),
  unit: z.string().trim().min(1).optional(),
  notes: z.string().trim().nullable().optional(),
  restock_threshold: z.number().finite().nonnegative().nullable().optional(),
  quantity_change: z.number().finite().optional(),
  expected_revision: z.number().int().nonnegative(),
  reason: z.string().trim().min(1),
});

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  let profile;
  try { profile = await requireManager(); }
  catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }
  if (profile.role !== "admin") return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Valid details and a correction reason are required" }, { status: 400 });
  const { reason, ...payload } = parsed.data;
  const { data, error } = await farmWrite(profile, "supply", "update", payload, { id: params.id, reason, requestId: body.request_id });
  if (error) return farmErrorResponse(error);
  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  let profile;
  try { profile = await requireManager(); }
  catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }
  if (profile.role !== "admin") return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  const body = await request.json().catch(() => null);
  if (!body || typeof body.reason !== "string" || !body.reason.trim()) {
    return NextResponse.json({ error: "Removal reason is required" }, { status: 400 });
  }
  const { data, error } = await farmWrite(profile, "supply", "archive", { expected_revision: body.expected_revision }, { id: params.id, reason: body.reason.trim(), requestId: body.request_id });
  if (error) return farmErrorResponse(error);
  return NextResponse.json(data);
}
