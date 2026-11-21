import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { managerReadError, requestManagerScope } from "@/lib/manager-read-api";
import { withManagerWrite } from "@/lib/manager-write-api";
import { farmErrorResponse } from "@/lib/farm-v2";
import { CARE_RECORD_ACTIVITIES, careRecordQuerySchema, careRecordWriteSchema } from "@/lib/farm-care-record";

export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  try {
    const scope = await requestManagerScope(request, "farm");
    const parameters = new URL(request.url).searchParams;
    const query = careRecordQuerySchema.safeParse({
      register_id: parameters.get("register_id") ?? undefined,
      page: parameters.get("page") ?? "1",
    });
    if (!query.success) {
      return NextResponse.json({ error: "Choose a valid register and page." }, { status: 400, headers });
    }

    const database = createServerClient();
    if (!database) return farmErrorResponse({ code: "503", message: "Health record unavailable" });
    const { data, error } = await database.rpc("farm_care_record_read", {
      p_actor: scope.actorId,
      p_period: scope.periodId,
      p_register: query.data.register_id ?? null,
      p_page: query.data.page,
    });
    if (error) return farmErrorResponse(error);
    return NextResponse.json(data, { headers });
  } catch (error) {
    return managerReadError(error);
  }
}

export async function POST(request: Request) {
  return withManagerWrite(request, "farm", async (scope) => {
    const result = careRecordWriteSchema.safeParse(await request.json().catch(() => null));
    if (!result.success) {
      return NextResponse.json({ error: "Check the information in the health record and try again." }, { status: 400, headers });
    }

    const { operation, register_id, request_id, payload } = result.data;
    if (result.data.operation === "save_row" && result.data.payload.page === 1) {
      const { row_number, activity } = result.data.payload;
      if (row_number === null || CARE_RECORD_ACTIVITIES[row_number - 1] !== activity) {
        return NextResponse.json({ error: "Open the listed activity again before saving." }, { status: 400, headers });
      }
    }

    const database = createServerClient();
    if (!database) return farmErrorResponse({ code: "503", message: "Health record unavailable" });
    const { data, error } = await database.rpc("farm_care_record_write", {
      p_actor: scope.actorId,
      p_period: scope.periodId,
      p_register: register_id,
      p_operation: operation,
      p_request: request_id,
      p_payload: payload,
    });
    if (error) return farmErrorResponse(error);
    return NextResponse.json({ data }, { status: 201, headers });
  });
}
