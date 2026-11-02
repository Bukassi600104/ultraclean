# Tuesday readiness release

## Intended changes

CEO overview uses the approved original screenshot's dark sidebar, clear active state, white cards and larger bold headings. Financial source records and calculations are retained. Requests gain private photos and an explicit decision dialog; purchase-linked decisions use the purchasing workflow. Physical-count reviews remain explicit in Feed Inventory. Sales presents sale/payment actions and recent records using existing guarded operations.

No historical record, balance, inventory quantity, account or password is reset. Login-protection activation remains on hold. No automatic WhatsApp delivery is enabled.

## Release checks

Use isolated data for request/photo/decision retries, linked purchase/feed handling, accounts, onboarding, manager isolation, exports and accounting regressions. Inspect layouts at 375, 390, 768 and 1440 pixels. Complete lint, TypeScript and production build, restore a fresh private backup and compare original records after rehearsing the new migration. Release only after these checks pass. Verify the exact Git commit on Vercel production and live version endpoints.

Private backups and verification evidence remain outside Git. Do not insert demonstration transactions into production. Keep compatible APIs and queued submissions during rollback; prefer a compatible hotfix rather than restoring historical database snapshots over ongoing work.

The pre-release Supabase advisory baseline includes existing function search-path/execute-grant notices and disabled leaked-password checks. They are separate from this release; some execute grants support existing role policies and trigger functions. Do not change them as a layout fix. See [function search paths](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable), [function execute grants](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable) and [password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). The new dispatcher must be callable only by the server role.

## Bimbo's walkthrough

1. Open CEO Dashboard, then Manage Accounts. Choose Add Manager, select Primefield Farm, enter the new manager's own details and work start date, and share the Farm login link securely. Do not share the old manager's account.
2. The new manager signs in at https://farm.primefieldagric.com/login and completes the inventory handover. Confirm what is physically present or report a discrepancy. Confirmation does not add stock or transfer earlier debts.
3. In Operational Requests, send an operational issue with its date, details and optional photo. Use the existing purchase form when requesting a purchase with items, prices and supplier details.
4. In the CEO Farm section, open the request and review its details before deciding. Purchase approval authorizes the purchase; payment and delivery are recorded separately. A physical-count review explains any proposed stock correction.
5. Use Record a sale for the sale itself and Record a payment for money received against an existing customer balance. Follow the quantity and weight labels; do not enter a second sale to record a later payment.
6. Filter CEO manager reports by the new manager and reporting period. Their personal activity remains separate from previous managers.
7. Download the special historical Excel exports for Farm Manager and Emmanuel Adeolu. Check the workbook before optionally suspending the old account. Exporting or suspending does not delete past entries.

Physical-phone and signed-in production acceptance remains with Bimbo and the managers. Isolated test success does not establish that every individual phone or network has been checked.

## Verification evidence

All 110 isolated release suites passed: 91 in the initial run and 19 after updating an obsolete collapsed-panel selector in the CEO test. Final lint, TypeScript and production build passed. Request tests reproduce the previous linked-purchase approval rejection, verify the new decision and preserve pre-update retries. The restore rehearsal compared 142 original public/auth/storage tables unchanged, including credentials; 64 storage objects were backed up. Supabase migration 20261102085705 adds only the guarded dispatcher, with execution denied to anonymous/authenticated roles and granted to service_role. Existing security-advisor counts were unchanged. No live business transactions were entered for testing.
