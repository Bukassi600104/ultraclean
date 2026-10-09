# BossBimbz database expansion

**Production activation verified October 9:** All four expansion migrations are installed through the Supabase plugin, historical public-table fingerprints were preserved, and the coordinated farm-write pause was removed. See [production release evidence](BOSSBIMBZ-MOBILE-RELEASE.md). The inspection below records the historical preparation baseline, branch `bossbimbz-operations-expansion`, commit `574eee3f6358c03707adfb547deb9d289b1aeaf0`. Migrations 012 and 013 remain unchanged and must never be replayed on the existing project.

## Production inspection

Read-only Supabase MCP inspection on October 5, 2026 verified project `gsxqrjywtugeuexrjcln`, name `Bukassi600104's Project`, region `eu-west-1`, status `ACTIVE_HEALTHY`, PostgreSQL 17.6. Organization `oujwwnbclimrpkbchpoq` / `Ultratidy Software` reports `plan=free`, `tier=tier_free`. Database size at inspection was 14,781,587 bytes. Existing profiles comprise three `admin` and two `manager` accounts. No profile, authentication account, password, production record, grant or function was changed during this task.

Production `farm_v2_write` and `farm_v2_lock_date` are owned by `postgres`, are security-definer functions and grant execution only to their owner and `service_role`. Existing farm tables have no INSERT/UPDATE/DELETE grants for `anon`, `authenticated` or `service_role`; service-role SELECT remains. Existing farm RLS policies remain in place. Captured profile whole-row digest is `b6060756248832f578f4afc5ef0101a8`; combined V2 function-definition digest is `de4083b15a25cb4317c067e894f1571d`; farm policy count is 25. These are comparison fingerprints, not backups.

## Migrations and tables

The three filenames were allocated using `supabase migration new bossbimbz_operations`. Each slice runs in a transaction with a five-second lock timeout and sixty-second statement timeout. Apply once, in filename order, only during a separately authorized coordinated release.

| Migration | New tables |
| --- | --- |
| `20261005113523_bossbimbz_operations.sql` | `farm_daily_reports`, `farm_operational_requests`, `farm_operation_events`, `farm_operation_receipts` |
| `20261005113609_bossbimbz_operations.sql` | `property_properties`, `property_units`, `property_tenancies`, `property_rent_payments`, `property_expenses`, `property_maintenance`, `property_events`, `property_write_receipts` |
| `20261005113615_bossbimbz_operations.sql` | `content_records`, `content_performance`, `content_leads`, `content_sales`, `content_social_integrations`, `content_social_tokens`, `content_audit`, `content_write_receipts` |

The only existing-table DDL replaces the captured `profiles_role_check` with the same accepted roles plus `property_manager` and `content_manager`. Existing roles are retained; no existing account receives a new role. Existing `is_admin`, `is_manager`, V2 functions, tables, finance semantics and day-state records remain unchanged. The first slice requires the existing V2 RPC and captured named profile constraint; unexpected schema drift fails the migration rather than reconstructing old tables.

Explicit lookup/queue indexes: `farm_reports_history`, `farm_requests_queue`, `farm_operations_history`, `property_units_property`, `property_rent_history`, `property_expense_history`, `property_maintenance_queue`, `property_events_history`, `content_publication_history`, `content_lead_history`, `content_sales_history`, `content_audit_history`. Integrity indexes additionally enforce one report per manager/date, one request per linked report, unique unit names per property, one active tenancy per unit, one integration/token per platform/account relation, and one account/content metric snapshot per date. Primary keys support the remaining entity and retry lookups.

## Server write contract

All three write RPCs return the saved row as JSON and share this signature:

```sql
farm_operations_write(p_actor uuid,p_kind text,p_operation text,p_payload jsonb,
 p_id uuid default null,p_reason text default null,p_request_id uuid default null)
property_write(/* same parameters */)
content_write(/* same parameters */)
```

Only `service_role` can execute these routines. APIs must authenticate the session with `getUser`, look up the trusted active profile and pass its ID as `p_actor`; never accept a client-supplied actor. The database rechecks profile role and suspension. Direct table INSERT/UPDATE/DELETE is revoked even from `service_role`. Privileged routines use an explicit search path and whitelist table/field names. Browser roles cannot execute write RPCs. Do not widen grants to make an older deployment work.

Every non-create operation requires `p_payload.expected_revision` matching the displayed row revision. Updates increment revision. Property/content updates require a nonblank `p_reason`, limited to 2,000 characters. Farm CEO review/decision fields form part of the audit; API may additionally require a reason. Optional request UUIDs persist a per-actor result/fingerprint in domain-specific receipts. Identical retries return the saved result; changing payload/action/target/reason with the same UUID fails. Role checks precede receipt lookup. Domain advisory locks serialize multi-row invariants. Every data write and its audit/receipt commit together; failure rolls the entire transaction back. Audit history is append-only.

## Farm contract

Kinds/actions: `report`: `create`, `update`, `submit`, `review`; `request`: `create`, `respond`, `approve`, `decline`, `resolve`.

Report fields: `id`, `report_date`, `manager_id`, `status` (`draft` or `submitted`), `sections`, `decision_required`, `submitted_at`, `reviewed_by`, `reviewed_at`, `review_note`, `revision`, `created_at`, `updated_at`. Manager attribution comes from the actor. One manager report per date supports saving a draft then submitting. Submitted report content cannot be rewritten; CEO review adds review metadata and a history event. The day-open/close table remains responsible for closure.

Sections must contain exactly six objects, with only these fields:

| Section | Allowed fields |
| --- | --- |
| `farm1` | `pond1`, `pond2`, `pond3`, `pond4`, `water_issue` |
| `farm2` | `vat1`, `vat2`, `vat3`, `mortality`, `water_issue`, `pump_status` |
| `livestock` | `goats`, `ram`, `cattle`, `piggery`, `poultry`, `mortality`, `sick_animals`, `feed`, `water` |
| `crops` | `report` |
| `people` | `workers_present`, `supervisor`, `tasks_completed` |
| `problems` | `issues`, `action_taken`, `request_category` |

Values are strings up to 3,000 characters; `workers_present` additionally permits an integer of up to four digits. The complete structured report is limited to 30KB. Draft sections may be incomplete; required submission completeness is enforced by the application schema. `decision_required` must be a JSON boolean. Narrative reports do not generate stock movements, financial costs or mortality deductions.

Submitting a report with `decision_required=true` atomically creates a request using the report's date/manager, `problems.issues` as description and `problems.request_category` (default `other`). Invalid/empty request descriptions or categories roll back submission. The linked request is retrieved by its unique `report_id`; no second entry is needed. A standalone request cannot supply a report link.

Request fields: `id`, nullable `report_id`, `request_date`, `requested_by`, `category`, `description`, `status`, `ceo_response`, `decision_by`, `decision_at`, `resolution`, `resolved_at`, revision/timestamps. Categories are `purchase`, `feed`, `veterinary`, `repair`, `maintenance`, `equipment`, `staffing`, `emergency`, `other`. Statuses are `pending`, `approved`, `declined`, `resolved`. CEO decisions require `ceo_response`; resolution additionally requires `resolution` and an approved request. Respond retains current status; approval/decline require pending state; declined/resolved records cannot receive more decisions.

New entries/draft updates/submission acquire the existing V2 write lock and call the existing date guard. Farm managers cannot write closed dates. Admin writes to closed dates require a reason. CEO decisions/reviews can happen after day closure because they do not alter the operational report or accounting. RLS reads allow active farm managers to see only their own reports/requests and related events; active admins can supervise all. Receipt tables are server-only. Farm correction requests remain a separate workflow.

## Property contract

Kinds are `property`, `unit`, `tenancy`, `rent_payment`, `expense`, `maintenance`; actions `create`/`update`.

| Kind/table | Business fields |
| --- | --- |
| `property` / `property_properties` | `name`, `address`, `status` (`active`/`inactive`), `currency` |
| `unit` / `property_units` | `property_id`, `name`, `status` (`vacant`/`occupied`/`unavailable`) |
| `tenancy` / `property_tenancies` | `unit_id`, `tenant_name`, `tenant_contact`, `start_date`, `end_date`, `rent_amount`, `currency`, `status` (`active`/`ended`) |
| `rent_payment` / `property_rent_payments` | `tenancy_id`, `amount`, `currency`, `payment_date`, `period_start`, `period_end`, `payment_method`, `notes` |
| `expense` / `property_expenses` | `property_id`, nullable `unit_id`, `category`, `amount`, `currency`, `expense_date`, `notes` |
| `maintenance` / `property_maintenance` | `property_id`, nullable `unit_id`, `issue`, `category` (`maintenance`/`repair`), `status` (`open`/`in_progress`/`resolved`), `priority` (`low`/`normal`/`high`/`urgent`), nullable `cost`, `currency`, `resolution` |

Each row has server-generated ID/actor/timestamps/revision. PostgreSQL validates calendar dates and nonnegative/positive numeric amounts. Currency is an explicit three-letter uppercase code. Parent links and property currency are fixed after creation. Composite foreign keys prevent selecting a unit from another property. Rent currency must match tenancy currency; tenancy/expense/maintenance currency must match property currency. Rent periods must be ordered and fall within the tenancy dates; tenancy date corrections must retain existing paid periods. Ended tenancies require an end date. One active tenancy per unit is enforced; active tenancy creation marks occupied; ending it marks vacant. Contradictory unit status edits and active occupancy of unavailable units fail. Tenancy and resulting unit state both receive audit events atomically. Resolved maintenance requires a resolution.

Active property managers and admins read/write the domain. Other roles cannot read its RLS-protected tables or perform its RPC operations. Money totals must be grouped by currency, with no implicit exchange rates. Maintenance cost is recorded information and must not be added to expenses automatically: an expense remains the authoritative recorded payment.

## Content and social contract

Kinds are `record`, `performance`, `lead`, `sale`, `integration`, `token`; actions `create`/`update`. Ordinary records are accessible to active content managers/admins; social authorization/token writes require an active admin actor.

| Kind/table | Business fields |
| --- | --- |
| `record` / `content_records` | `title`, `platform`, `content_type`, `status` (`draft`/`scheduled`/`published`/`archived`), `published_at`, `scheduled_at`, `url`, `notes` |
| `performance` / `content_performance` | nullable `content_id`, `platform`, `account_id` (default empty string for manual account data), `metric_date`, nullable `followers`, `reach`, `impressions`, `engagements`, `source` (`manual`/`official`), `notes` |
| `lead` / `content_leads` | nullable `content_id`, `platform`, `name`, `contact`, `status` (`new`/`contacted`/`converted`/`closed`), `lead_date`, `notes` |
| `sale` / `content_sales` | nullable `content_id`/`lead_id`, `sale_type` (`mentorship`/`affiliate`), `amount`, `currency`, `sale_date`, `customer_name`, `notes` |
| `integration` / `content_social_integrations` | `platform`, `account_id`, `account_name`, `status` (`disconnected`/`connected`/`error`), server-assigned `authorized_by`/`authorized_at`, `last_sync_at`, `last_error` |
| `token` / `content_social_tokens` | `integration_id`, `ciphertext`, nullable `expires_at` |

Platforms are `instagram`, `facebook`, `tiktok`. Published/scheduled states require their timestamps; URLs permit only HTTP(S) without whitespace. Metric values are nonnegative integers; at least one metric is required. Platform must match linked content. One account/platform/date snapshot and one content/date snapshot prevent duplicate imports. Manual metrics require no social authorization; official-source writes require an admin actor. A linked sale's content must match its lead's content. Monetary sales retain explicit currency.

Social access tokens **must be encrypted by trusted server code using an external environment encryption key before calling the token RPC**. No passwords or plaintext tokens belong in this schema. Tokens have no direct SELECT grant for browsers, content managers, admins using browser clients, or even service-role table queries. `content_social_token_read(p_actor uuid,p_integration_id uuid)` is callable only by service role and rechecks an active admin actor. It returns the encrypted token only for a connected integration, an unexpired token and a token written since the latest authorization. Reauthorization invalidates old ciphertext until token refresh. Disconnect/error states disable token reads. Token-write results, receipts and audit snapshots omit ciphertext. Safe integration metadata may be read by content managers; OAuth state/verifier remain server-side application concerns.

## Verification and release gate

For safe reauthorization, server-only `content_social_token_metadata(p_actor,p_integration_id)` returns just the token row ID and revision even when an old secret has expired or been invalidated. It rechecks active admin identity and grants execution only to service role. This lets the callback replace the existing row without revealing its ciphertext, weakening expiry, or granting direct reads. Five isolated assertions cover this addition.

`node scripts/test-bossbimbz-database.mjs` passes **306 assertions** in isolated PGlite PostgreSQL using the existing sanitized V2 fixture. It never loads environment files or accesses a network database. Install/use the existing private temporary PGlite runtime, or specify its module path with `FARM_V2_PGLITE_PATH`.

The rehearsal applies 012/013 **only to the isolated fixture**, then applies the new slices. Assertions prove old function definitions, initial legacy values, profiles and all old table counts remain stable; cross-role RPC denial; absence of direct writes; per-domain RLS reads; submitted-history immutability; automatic linked request/rollback; closed-day guards; retries/stale state; tenancy occupancy/currency/period/link invariants; publication timestamp/link validation; metric deduplication; secret read/write denial and audit secrecy. Append-only audits reject modification. A final original V2 sale still computes its persisted total and stock movement atomically.

This is a deterministic isolated rehearsal, not a claim of real multi-session PostgreSQL lock testing. Production permission/catalog inspection is read-only. Hosted advisors have not assessed the uninstalled new schema. The existing full V2/regression/API/build suites are separate application release gates.

Release requires a fresh private backup and baseline, current profile/function/table fingerprint comparison, reviewed migration order, application compatibility and explicit authorization. Do not use a blanket runner that replays old migrations. Capture live role/grant/policy evidence after the authorized installation; stop on schema drift or unexplained legacy differences. No deploy, push or production migration is part of this database preparation.

Rollback should revert compatible application behavior while preserving additive schema, operational records, audit and receipt data. Do not restore direct service-role writes, drop audit tables, change existing account IDs or replay seeds. Removing widened roles is unsafe after new manager accounts exist. Retain existing V2 write boundaries.

## Free-plan impact

SUPABASE PAID FEATURES: **NONE**. PAID SOCIAL API: **NONE**.

Twenty additive tables use ordinary PostgreSQL/RLS/functions/indexes only; no paid extension, replica, PITR, custom domain, disk upgrade or billing change. No new Supabase Storage bucket, Realtime publication or Edge Function is required. Production database/storage growth from this task is zero because migrations are pending. Future growth comes from operational rows plus bounded JSON audit snapshots and retry receipts; do not discard history without a retention decision. Review actual database size after installation and monitor ordinary table/index growth against the organization's free-plan quota. Limit/paginate history reads to reduce API egress; official social sync should be bounded and manual entry remains available when provider access is unavailable. No fabricated feed inventory or production-cost meaning is introduced.
