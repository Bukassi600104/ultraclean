import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { farmWrite, farmErrorResponse } from "@/lib/farm-v2";
import { z } from "zod";
const schema = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), amount: z.number().positive().optional(), notes: z.string().max(1000).nullable().optional(), reason: z.string().trim().min(1).max(1000), expected_revision: z.number().int().nonnegative() });
async function mutate(request: NextRequest, id: string, operation: "update" | "void") {
 let profile; try { profile = await requireAdmin(); } catch { return NextResponse.json({ error: "Admin only" }, { status: 403 }); }
 const parsed = (operation === "update" ? schema : schema.pick({ reason: true, expected_revision: true })).safeParse(await request.json().catch(() => null));
 if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors }, { status: 400 });
 const { reason, ...payload } = parsed.data;
 const { data, error } = await farmWrite(profile, "fund", operation, payload, { id, reason, requestId: request.headers.get("X-Request-ID") || undefined });
 if (error) return farmErrorResponse(error);
 return NextResponse.json(operation === "void" ? { success: true } : data);
}
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) { return mutate(request, params.id, "update"); }
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) { return mutate(request, params.id, "void"); }
