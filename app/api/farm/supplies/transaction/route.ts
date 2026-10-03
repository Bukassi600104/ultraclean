import { NextRequest, NextResponse } from "next/server";
import { requireManager } from "@/lib/auth";
import { farmWrite, farmErrorResponse } from "@/lib/farm-v2";
import { z } from "zod";

export const runtime = "nodejs";
const transactionSchema = z.object({
  item_id: z.string().uuid(),
  action: z.enum(["purchase", "use", "adjustment"]),
  quantity: z.coerce.number().finite().refine((n) => n !== 0),
  notes: z.string().trim().nullish(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  reason: z.string().trim().optional(),
});

export async function POST(request: NextRequest) {
  let profile;
  try { profile = await requireManager(); }
  catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }
  const body = await request.json();
  const parsed = transactionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid supply transaction" }, { status: 400 });
  const { quantity, reason, ...payload } = parsed.data;
  if (payload.action === "adjustment" && (profile.role !== "admin" || !reason)) {
    return NextResponse.json({ error: "Admin access and correction reason required" }, { status: 403 });
  }
  if (payload.action !== "adjustment" && quantity <= 0) {
    return NextResponse.json({ error: "Quantity must be positive" }, { status: 400 });
  }
  const quantity_change = payload.action === "use" ? -quantity : quantity;
  const { data, error } = await farmWrite(profile, "supply_transaction", "create", { ...payload, quantity_change }, { reason, requestId: body.request_id });
  if (error) return farmErrorResponse(error);
  return NextResponse.json(data, { status: 201 });
}
