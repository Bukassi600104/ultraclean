import assert from "node:assert/strict";
import { typescriptLoader } from "../tests/helpers/load-typescript.mjs";

const actor = "00000000-0000-4000-8000-000000000001";
const period = "00000000-0000-4000-8000-000000000002";
const requestId = "00000000-0000-4000-8000-000000000003";
const endpoint = "http://localhost/api/farm/health/record";
const calls = [];
let signedIn = true;
let databaseError = null;
const load = typescriptLoader({
  "@/lib/manager-read-api": {
    requestManagerScope: async (_request, business) => {
      assert.equal(business, "farm");
      if (!signedIn) throw Object.assign(Error("Access required"), { code: "401" });
      return { actorId: actor, periodId: period, managerId: actor, mode: "personal" };
    },
    managerReadError: (error) => Response.json({ error: error.message }, { status: Number(error.code) === 401 ? 401 : 403 }),
  },
  "@/lib/supabase/server": {
    createServerClient: () => ({
      rpc: async (name, args) => {
        calls.push({ name, args });
        return { data: { page: args.p_page ?? args.p_payload?.page ?? 2 }, error: databaseError };
      },
    }),
  },
});
const route = load("app/api/farm/health/record/route.ts");
const scope = { "X-Manager-Actor": actor, "X-Manager-Period": period };
const write = (body, headers = scope) => new Request(endpoint, {
  method: "POST", headers, body: JSON.stringify(body),
});
const row = {
  operation: "save_row", register_id: period, request_id: requestId,
  payload: {
    page: 1, row_number: 1, activity: "Fowl pox booster",
    expected_revision: 0, values: { animal_group: "Layers", record_date: "2026-11-20", animal_status: "alive" },
  },
};
const response = await route.POST(write(row));
assert.equal(response.status, 201);
assert.equal(response.headers.get("cache-control"), "private, no-store");
assert.deepEqual(calls.at(-1), {
  name: "farm_care_record_write",
  args: { p_actor: actor, p_period: period, p_register: period, p_operation: "save_row",
    p_request: requestId, p_payload: row.payload },
});
assert.equal((await route.POST(write({ ...row, operation: "add_page", payload: {} }))).status, 201);
assert.equal((await route.POST(write({ ...row, operation: "save_review", payload: { page: 2, text: "Review", expected_revision: 0 } }))).status, 201);
assert.equal((await route.POST(write({ ...row, payload: { ...row.payload, page: 2, row_number: null, activity: "Follow-up inspection" } }))).status, 201);

for (const body of [
  { ...row, actor_id: requestId },
  { ...row, payload: { ...row.payload, activity: "Different preset" } },
  { ...row, payload: { ...row.payload, row_number: null } },
  { ...row, payload: { ...row.payload, values: { record_date: "2026-02-30" } } },
  { ...row, payload: { ...row.payload, values: { animal_status: "unknown" } } },
  { ...row, payload: { ...row.payload, values: {} } },
  { ...row, payload: { ...row.payload, values: { location: "x".repeat(201) } } },
  { ...row, operation: "save_review", payload: { page: 2, text: "   ", expected_revision: 0 } },
]) {
  assert.equal((await route.POST(write(body))).status, 400);
}
assert.equal((await route.POST(write(row, { ...scope, "X-Manager-Period": requestId }))).status, 403);
assert.equal((await route.POST(write(row, { ...scope, "X-Manager-Actor": requestId }))).status, 403);
assert.equal(calls.length, 4, "invalid requests never call the database");

const read = await route.GET(new Request(endpoint + "?page=2&register_id=" + period));
assert.equal(read.status, 200);
assert.equal(read.headers.get("cache-control"), "private, no-store");
assert.deepEqual(calls.at(-1), { name: "farm_care_record_read", args: { p_actor: actor, p_period: period, p_register: period, p_page: 2 } });
for (const query of ["page=0", "page=NaN", "register_id=other"]) {
  assert.equal((await route.GET(new Request(endpoint + "?" + query))).status, 400);
}
signedIn = false;
assert.equal((await route.GET(new Request(endpoint))).status, 401);
assert.equal((await route.POST(write(row))).status, 401);
assert.equal(calls.length, 5, "anonymous and invalid reads cannot reach the database");

signedIn = true;
databaseError = { code: "40001", message: "This care entry changed. Open the latest version before saving" };
const conflict = await route.POST(write(row));
assert.equal(conflict.status, 409);
assert.match((await conflict.json()).error, /open the latest version/i);
console.log("PASS care record API inputs, trusted scope, private GET, anonymous denial and stale-edit errors");
