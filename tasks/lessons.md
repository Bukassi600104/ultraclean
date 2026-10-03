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
