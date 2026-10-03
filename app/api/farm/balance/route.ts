import { NextRequest, NextResponse } from "next/server";
import { requireManager } from "@/lib/auth";
import { getFarmFinance } from "@/lib/farm-finance";
import { z } from "zod";
export const runtime = "nodejs";
export async function GET(request: NextRequest) {
 try { await requireManager(); } catch { return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); }
 const params = new URL(request.url).searchParams;
 const schema = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() });
 const parsed = schema.safeParse({ date: params.get("date"), from: params.get("from") ?? undefined, to: params.get("to") ?? undefined });
 if (!parsed.success || (parsed.success && parsed.data.from && parsed.data.from > (parsed.data.to ?? parsed.data.date))) return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
 try { return NextResponse.json(await getFarmFinance(parsed.data)); } catch (error) { console.error("Farm finance error", error); return NextResponse.json({ error: "Failed to compute balance" }, { status: 500 }); }
}
