import {managerReadResponse} from "@/lib/manager-read-api";
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { requireManager } from "@/lib/auth";

export const runtime = "nodejs";

async function legacyGET() {
  try {
    await requireManager();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient();
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const { data, error } = await supabase
    .from("farm_inventory")
    .select("*")
    .order("product");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function GET(request: Request) {
 const scoped=await managerReadResponse(request,"farm","farm_inventory","array",false);
 return scoped ?? legacyGET();
}
