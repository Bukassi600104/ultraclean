# Lessons Learned

This file is updated after corrections or non-obvious decisions to prevent repeating mistakes.

---

## Pattern Log

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
