# Lessons Learned

This file is updated after corrections or non-obvious decisions to prevent repeating mistakes.

---

## Pattern Log

### Primefield V2 production preservation
- Checked-in farm migrations are incomplete; inspect the live catalog before specifying forward migrations.
- Preserve legacy generated sales values with DROP EXPRESSION, never dropping/recreating the amount column or guessing a historical basis.
- Service-role API clients bypass RLS; farm endpoints need explicit authorization and transactional write guards.
- Day opening must never upsert status=open over an existing closed date. Correction guards use the target record date.
- Supply FK cascade deletion would erase activity: archive items instead. Quantity corrections must check availability before the movement is inserted.
- Inventory and supply triggers run on INSERT only. Corrections use compensating movements and audit writes in the same transaction.
- All release operations remain unapproved until full backup restore, production mapping, staging verification and explicit approval are complete.

### Supabase direct DB connection unreachable from dev machine
- `db.[ref].supabase.co:5432` does not resolve from this machine (ENOTFOUND)
- The `run-migrations.mjs` script will always fail for DB-level changes (realtime, RLS, etc.)
- **Fix**: Always provide the raw SQL and ask user to run it in Supabase SQL Editor
- SQL for enabling realtime on a table: `alter publication supabase_realtime add table public.leads;`
- Fixed the migration script to use named pg.Client params (host/port/user/password) instead of a connection string URL, so passwords with special chars ($, #) don't break URL parsing

### Supabase Realtime pattern
- Browser client (`createClient()` from `lib/supabase/client.ts`) handles auth via session cookies — works in dashboard (authenticated)
- Use `useRef` to hold latest `fetchLeads` so the realtime subscription (set up once in `useEffect([], [])`) always calls the current version without re-subscribing on every filter change
- Always clean up channel with `supabase.removeChannel(channel)` in the effect's return

### CEO navigation and reporting scope — 28 October 2026
- CEO Properties and Content Manager menu entries must open reports within the CEO shell. Standalone operational apps retain their own manager workflows and account roles; shared reports read the same authoritative records.
- Preserve an explicitly cleared start date as all recorded history. Default the current month only when no start was supplied.
- Group content attribution by currency and content ID; titles are labels and may repeat. Disambiguate duplicate titles without merging the underlying records.
- Explicit Back navigation must protect unsaved values, including date-only edits. Clear dirty state after confirmed saves; retain unconfirmed offline payloads.
- Read financial numeric fields as decimal text and aggregate at full stored scale before final display rounding. Never rebuild historical ledgers to resolve a display mismatch.

### Manager handover and funds responsibility — 28 October 2026
- A fresh manager login needs server/database-scoped activity and cash responsibility, not merely empty UI cards. Keep business assets and legacy history intact.
- The recording actor is not necessarily the cash recipient or responsible manager. Bimbo-created historical transfers without a recipient must remain unallocated until genuine evidence is supplied.
- Internal procurement-to-manager receipts move custody of existing funds; they are neither extra owner funding nor an expense. Only the actual purchase reduces combined unspent funds.
- Isolate offline queues by authenticated account and operating period. Retain legacy unowned drafts for resolution rather than submitting them under the next login.
- Special legacy export eligibility is the two user-selected accounts, Farm Manager and Emmanuel Adeolu. Do not assume it applies to one account, Tony, or every manager.
- Feed operations are manager-led: the CEO observes and responds to requests, without mandatory opening-count entry or duplicate data entry. Routine feeding does not await optional review, and no ten-bag approval threshold was agreed.
- Keep confirmed physical feed delivery/opening distinct from an unresolved financial expense; later posting must not duplicate the physical receipt. Use actual activity dates plus automatic recorded timestamps, compact tables and centred dialogs.
- CEO is Bimbo's activity, reconciliation and decision control centre across existing businesses. Apply consistent layout to every sidebar and nested page; show only real live records and truthful empty/unknown/error states. Never use demo rows or fixture fallbacks to make production screens look populated.

- A failed list/detail request must retain its Back link and explicit retry state, not present an empty ledger, zero totals or a false missing-record redirect. Controlled house dialogs also need focus restoration when opened without a Radix trigger.
- Never install through a dependency junction into the primary live checkout. Give the isolated worktree its own directory and verify existing resolved versions/integrity after a dependency addition; scope compatible security patches to the new tree.

### Production verification and manager release — 29 October 2026
- Capture verified existing manager identities at first schema expansion under a profile lock; never grant broad legacy access to an identity created while the new feature is inactive. Gate new provisioning in the database as well as the interface.
- Preserve an existing manager's logical legacy draft/queue key across activation, while sending the current verified database period in authenticated requests. Permit only its own matching legacy retry receipt, never reuse it in a later personal period.
- Run Next.js builds and standalone TypeScript checks sequentially: they share generated .next/types/build info. Next route handlers must require the Request supplied by the framework; default parameters produce an invalid optional route signature.
- Restore public grants and policies during preservation rehearsal. Compare normalized fingerprints with explicit collation, and distinguish managed-service restore warnings from missing business data or permissions.
- Keep read failures visible when feature availability fails. A missing availability response must not turn a failed feed-history read into No records yet or discard unsaved form state.
- Review older ad-hoc tests before executing them. Use the explicit isolated release-suite allowlist; never run a test that contains production credentials or creates/deletes live accounts. Keep credential retirement separate and coordinated, without silent signing-key/session changes.

- 31 Oct: Expenses emphasis means move/promote its actual destination, not rename purchase workflows. WhatsApp is click-to-chat only; no automated reports or sender signup.
