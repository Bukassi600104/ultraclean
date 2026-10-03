import { NextRequest, NextResponse } from "next/server";
import { requireManager } from "@/lib/auth";
import { farmWrite, farmErrorResponse } from "@/lib/farm-v2";
import { z } from "zod";
import { FARM_PRODUCT_KEYS } from "@/lib/farm-products";
export const runtime = "nodejs";
const schema = z.object({
  product: z.enum(FARM_PRODUCT_KEYS).optional(),
  quantity: z.number().positive().optional(), unit_price: z.number().positive().optional(),
  weight_kg: z.number().positive().nullable().optional(), pricing_basis: z.enum(["per_kg", "per_unit", "per_head"]).nullable().optional(),
  gender: z.enum(["male", "female"]).nullable().optional(), other_product_name: z.string().max(100).nullable().optional(),
  customer_name: z.string().max(200).nullable().optional(), total_amount: z.number().nonnegative().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  payment_method: z.enum(["cash", "transfer", "pos"]).optional(), notes: z.string().max(1000).nullable().optional(),
  reason: z.string().trim().min(1).max(1000), expected_revision: z.number().int().nonnegative(),
});
async function mutate(request: NextRequest, id: string, operation: "update" | "void") {
  let profile;
  try { profile = await requireManager(); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }
  if (profile.role !== "admin") return NextResponse.json({ error: "Saved records require a correction request to Bimbo." }, { status: 403 });
  const body = await request.json().catch(() => null);
  const parsed = (operation === "update" ? schema : schema.pick({ reason: true, expected_revision: true })).safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  const { reason, ...payload } = parsed.data;
  const { data, error } = await farmWrite(profile, "sale", operation, payload, { id, reason, requestId: request.headers.get("X-Request-ID") || undefined });
  if (error) return farmErrorResponse(error);
  return NextResponse.json(operation === "void" ? { success: true } : { sale: data });
}
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) { return mutate(request, params.id, "update"); }
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) { return mutate(request, params.id, "void"); }
