import { NextRequest, NextResponse } from "next/server";
import { requirePropertyManager } from "@/lib/auth";
import { createServerClient } from "@/lib/supabase/server";
import { isPropertySection, parsePropertyWrite, propertyKinds } from "@/lib/property";

export const dynamic = "force-dynamic";
type Context = {params: {kind: string}};
export async function GET(request: NextRequest, {params}: Context) {
  try {await requirePropertyManager();} catch {return NextResponse.json({error: "Property access required"}, {status: 403});}
  if (!isPropertySection(params.kind) && params.kind !== "history") return NextResponse.json({error: "Unknown property resource"}, {status: 404});
  const db = createServerClient();
  if (!db) return NextResponse.json({error: "Property service unavailable"}, {status: 503});
  const raw = new URL(request.url).searchParams.get("page") ?? "0";
  if (!/^\d{1,6}$/.test(raw)) return NextResponse.json({error: "Invalid page"}, {status: 400});
  const page = Number(raw), size = 100;
  const table = params.kind === "history" ? "property_events" : propertyKinds[params.kind as keyof typeof propertyKinds].table;
  const {data, error} = await db.from(table).select(params.kind === "history" ? "*,actor:profiles!actor_id(name)" : "*").order(params.kind === "history" ? "happened_at" : "created_at", {ascending: false}).order("id", {ascending: false}).range(page * size, (page + 1) * size - 1);
  if (error) return NextResponse.json({error: "Unable to load property records. Please retry."}, {status: 500});
  return NextResponse.json({data: data ?? [], page, has_more: data?.length === size});
}
export async function POST(request: NextRequest, {params}: Context) {
  let actor;
  try {actor = await requirePropertyManager();} catch {return NextResponse.json({error: "Property access required"}, {status: 403});}
  if (!isPropertySection(params.kind)) return NextResponse.json({error: "Unknown property resource"}, {status: 404});
  let body;
  try {
    const text = await request.text();
    if (text.length > 15000) throw new Error("Record too large");
    body = parsePropertyWrite(params.kind, JSON.parse(text));
  } catch (error) {return NextResponse.json({error: error instanceof Error && !error.message.startsWith("[") ? error.message : "Check all required fields, dates, amounts and currency."}, {status: 400});}
  const db = createServerClient();
  if (!db) return NextResponse.json({error: "Property service unavailable"}, {status: 503});
  const {data, error} = await db.rpc("property_write", {p_actor: actor.id, p_kind: propertyKinds[params.kind].kind, p_operation: body.operation, p_payload: body.payload, p_id: body.targetId ?? null, p_reason: body.reason ?? null, p_request_id: body.request_id ?? null});
  if (error) {
    const conflict = ["40001", "23505"].includes(error.code);
    const invalid = ["22023", "23514", "23503", "23502", "22P02", "22007", "22008"].includes(error.code);
    return NextResponse.json({error: conflict ? "This record changed or conflicts with an existing record. Refresh and review before saving." : error.code === "42501" ? "Property access required" : error.code === "P0002" ? "The property record no longer exists. Refresh and review." : invalid ? error.message : "Unable to save. Your entry is retained; please retry."}, {status: conflict ? 409 : error.code === "42501" ? 403 : error.code === "P0002" ? 404 : invalid ? 400 : 500});
  }
  return NextResponse.json({data});
}
