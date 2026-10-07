# Confirmed feed bags: prospective stock and report additions

Prepared on the existing expansion branch; **not installed in production**. The original goal and October 7 clarification form one release scope. Existing V2 migrations 012/013 and October 5 expansion migrations are unchanged.

## Inspection and opening count

Read-only production inspection on October 7: 29 feed purchases record 92 integer bags from May 2 through August 28, 2026; only three daily-feed rows record three bags, May 2 through May 19. These unit-compatible numbers do not establish complete usage history. A calculated 89 bags is not authoritative and is never used.

The new migration `20261007061920_bossbimbz_feed_addendum.sql` creates `farm_feed_stock`, `farm_feed_stock_movements`, and server-only `farm_feed_stock_receipts`. No historical row is seeded, rewritten, linked or guessed. A missing stock row or NULL `current_bags` means **verified opening count required**, not zero. Bimbo/admin records the actual unopened bags per feed type and local/foreign source, with a count date and reason. Zero is a legitimate verified count. The opening count includes receipts already physically present; pre-opening receipt movements remain history and are not added again. Each stock row retains opening actor/time/date and a revision.

## One authoritative bag flow

Future feed-purchase INSERTs create exactly one receipt movement linked by unique `purchase_id`, atomically even through the existing V2 RPC. Before an opening count, receipts leave stock NULL. After initialization, a receipt adds its integer bags immediately. Backdated receipts preceding that opening count are rejected so a count is not silently double-counted.

`farm_feed_stock_write(p_actor,p_operation,p_payload,p_id,p_reason,p_request_id)` is service-role-only; it rechecks trusted active farm role, shares the V2 advisory/date locks, locks stock, and commits records/movements/retry results together. Operations:

- `opening`: admin only; date, feed_type, feed_source, bags_available >= 0, required physical-count reason. Only once.
- `adjust`: admin only; stock ID, date, signed nonzero bags_delta, expected_revision, required reason. Appends a movement; never rewrites prior history.
- `create_daily_feed`: original date/type/source/num_bags/notes plus bags_opened >= 0. Returns `{daily_feed,stock,movement}`. Zero means feeding from an already opened bag, with no deduction/movement; positive newly opened bags deduct immediately and require verified stock.
- `use`: links an existing owned, prospective daily_feed_id to bags_opened >= 1. The row must be dated on/after the opening and recorded since the opening; historical entries never imply bag openings. The unique daily-feed movement link prevents another deduction.

Stock cannot become negative. Positive use before a count fails with a clear conflict. Identical UUID retries return the saved result; changed retry payloads fail. Closure and stock write errors roll back the daily-feed record as well. Once a type/source is initialized, old daily-feed INSERTs without the authoritative stock RPC are rejected; the UI supplies explicit newly opened bags, including zero for partial feeding. Before initialization the legacy entry route retains its meaning without inferred stock movement.

`lib/farm-feed-stock.ts` supplies the trusted server helper. `GET /api/farm/feed-stock` returns `{data,total}`, stock rows include nullable current_bags and initialization metadata. `?history=1&stock_id=UUID&page=1` returns movement history (100 per page); optional date=YYYY-MM-DD filters the actual movement date, exact dates, actors and purchase/daily-feed links. `POST` accepts nested `{operation,payload,id?,reason?,request_id?}` for opening/adjust/use, with a valid retry UUID. Actors are never accepted from clients. Farm roles read stock/history; other managers cannot. Direct writes are revoked from browser and service roles; movement UPDATE/DELETE is denied.

Daily Reports only summarize/link daily-feed activity. Narrative Feed fields never create another movement. A physical stock correction is explicit and independent of financial invoice changes. For prospectively linked receipts, quantity/type/source/date are fixed; cost/notes remain correctable through V2. Legacy unlinked purchase corrections retain their existing behavior. Linked daily-feed type/source/date are fixed after opening; notes and original feeding quantities do not silently change bag movements.

## Addendum report/request and content safeguards

The forward validator accepts optional template_version=2, each pond/vat's four confirmed nested strings, optional farm-wide water_issue (Farm 1 and Farm 2) and pump_status (Farm 2) bounded strings, separate animal groups and a bounded sick-animal array. Existing report strings remain valid and unchanged. Water/pump request categories are added. New automatic linked requests snapshot action_taken from their originating report; older request attribution remains NULL. The existing report submission and linked request audit remain atomic.

A preservation-safe content trigger rejects changing a record's platform when lead or performance rows reference it. Unlinked platform changes remain allowed. No historical child rows are propagated or rewritten.

## Release and recovery

Apply this additive migration once, after the three October 5 expansion migrations and only during an explicitly authorized coordinated release with a fresh restorable backup. It has five-second lock and sixty-second statement limits. Do not run a blanket migration script that replays V2. Production data/accounts/grants are unchanged during preparation. Supabase paid features: **none**; ordinary PostgreSQL tables, functions, triggers and RLS only.

Keep the additive schema and audit history when reverting application behavior. An older application cannot create daily-feed entries for initialized stock; retain the compatible feed workflow or keep farm writes paused until a compatible version is verified. Never remove stock guards or restore direct writes to make an older deployment work. No physical opening count is invented during rollback.

## Evidence

`node scripts/test-bossbimbz-feed-database.mjs`: 47 isolated PGlite assertions; no environment credentials or network database. Checks include no legacy movements/rewrites, original V2 function preservation, physical opening/prior-receipt cutoff, prospective receipt, linked use once, retries, rollback, negative/closed/stale denial, partial feeding zero, legacy preservation, cost-only corrections, report action snapshot, linked-content platform denial, cross-domain reads and service-write denial.

`node scripts/test-bossbimbz-feed-api.mjs`: 25 actual transpiled handler checks for cross-role denial, admin-only counts, actor derivation, signed/whole/calendar input, retry identifiers and database conflict envelopes. Separate existing V2/expansion/application/UI suites remain release gates; PGlite is not evidence of real multi-session race testing.
