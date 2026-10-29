# Manager handover and reconciliation: production release record

## Scope and current release state

This implements the approved 28 October manager-handover plan and its feed/CEO control-centre addenda. Implementation, isolated verification and the fresh independent review are complete. On 29 October the user explicitly authorized the coordinated production release, replacement and retirement of exposed API keys, and public signup closure. The coordinated application/schema release is live and verified; final main-branch build identity is retained in the private release manifest.

New managers receive personal operating periods with no inherited transactions, cash or debts. Verified manager custody is available only in personal periods; legacy accounts keep their original spending workflow and cannot receive allocations that their ordinary expenses would not debit. Bimbo may explicitly start a personal period when appropriate; no period/account is reset automatically. Existing assets require explicit assignment or confirmed Farm handover. Existing accounts keep their identities, credentials, status and historical records. Closing or starting an operating period remains an explicit CEO action.

Money sent directly to a manager awaits that manager's receipt confirmation. Procurement-to-manager receipts move existing custody once. An expense without verified available funding remains pending; the CEO confirms its actual payer on its original date. Confirmed physical feed delivery is retained independently and cannot be counted again when its cost is resolved. The original business ledgers remain authoritative; custody is their breakdown, not extra revenue or funding.

Managers record actual starting, received and opened feed bags once, with activity date and server-recorded actor/time. CEO reviews and observes; she does not re-enter their counts. Ordinary feeding does not wait for optional approval. Whole unopened bags and fractional daily feeding remain distinct.

CEO controls and reports stay inside the dashboard. Shared layouts retain deterministic parent links, centred constrained forms, usable phone dialogs, readable text and genuine empty/error states. Exports are real XLSX files restricted to the two approved existing accounts; no historical attribution or opening cash is invented.

## Preservation and concurrency evidence

Fresh private backup: `production-before-expansion.dump`, 767,812 bytes, SHA256 `01adf4ddba7fb36c1069b42c1af89868e5240bce64053ffc4e42668fa317efe6`. Backup, source fingerprints, restored databases and export comparisons remain outside the repository in the local private backup folder.

Two PostgreSQL 17 restore rehearsals verified all 84 original Auth/public/storage tables, including all 49 original public tables and all eight profiles. Original row counts and complete row-JSON fingerprints matched after **each** migration and after activation. The coordinated rehearsal also proved Farm pause, migration, activation and resume without any original-row change. Legacy amounts, actor gaps, quantities and account fields are covered by those complete-row comparisons.

The restore retained ACLs, rather than suppressing them. Its 383 original public-table grants and 61 policies independently match a read-only production comparison using explicit C collation. Normalized fingerprints are `fc419d0d64f74aab269e5d520844c4bf` and `1cf8636ff3332cdac63dd09b8f6cfa43`. Seven restore warnings concern excluded managed Realtime/GraphQL/statistics objects; no business/Auth row or public business grant was skipped. This local rehearsal does not emulate those managed services.

Both eligible real-account export snapshots round-trip through XLSX completely, including exact original JSON, within the 4 MiB whole-response cap. No live export/test data was inserted. New staff cannot call actor-supplied cash RPCs directly or insert postings; anonymous scope calls are denied; trusted server execution remains available.

Thirteen checks using **two real PostgreSQL connections** proved stale stock/handover protection, one successful allocation when two concurrent ₦700,000 requests compete for ₦1 million, receipt idempotency, close/write serialization, retained original closure metadata and balanced exact postings. Synthetic writes occurred only in a separate disposable restored clone.

`node scripts/test-manager-release.mjs` is an explicit allowlist of 62 isolated suites. They were verified in execution groups, with affected regressions repeated after each reproduced review finding; older ad-hoc Auth/production scripts were excluded.

| Verification | Result |
| --- | --- |
| `npm run lint`, `npm run build`, sequential `tsc --noEmit` | Pass, including Next-generated route types and 124 production pages |
| Unchanged public-site Playwright suite, isolated built server | All 81 pass; public source unchanged by later private-manager fixes |
| Actual CEO route/layout/error/keyboard/identity matrix | 144 checks, 32 pages, 390/768/1440 widths and short-phone forms |
| Actual operational parent links | 87 checks; unsaved Farm/Property/Content navigation retains input and owned pending submission |
| Provider/offline boundaries, funds UI, manager report UI, feed UI | 14 / 36 / 19 / 41 checks pass |
| Custody / financial posting / complete snapshot / legacy custody boundary | 64 / 59 / 35 / 13 checks pass |
| Real XLSX SQL / workbook / API / button UI | 24 / 40 / 35 / 13 checks pass |
| Real PostgreSQL two-connection races | All 13 pass against the reviewed migration clone |
| Source preservation through pause, all migrations, activation and resume | All 84 original table counts/full-row fingerprints match |
| Fresh whole-change review and narrow follow-ups | Three material findings reproduced, fixed and cleared; no remaining material findings |
| Built-application GET smoke | 13 pass; local Primefield Host canonical redirect still requires branded staging/live verification |

The built chunks were inspected to confirm the final movement-date filter, explicit admin queue identity and independent feed-history retry are present. A standalone TypeScript check was run only after the final build finished. The unchanged public suite never submitted valid production transactions or created accounts. Signed-in production verification passed against the promoted build and activated schema, including the 16 protected API reads and four CEO pages recorded below.

Review fixes: prevent tracked manager cash in legacy periods whose ordinary forms retain the legacy ledger flow; archive definite rejected receipts/decisions before unlocking while retaining uncertain retries; filter displayed source rows/counts to the selected activity dates without narrowing opening-balance calculation inputs. Backdated feed movements use `movement_date`, rather than their recording timestamp.


## Existing security release conditions

Read-only verification found public signup enabled while the existing new-user trigger creates profiles with the default admin role. The application has no public Auth-registration workflow. Before enabling CEO-controlled provisioning, disable public signup while preserving existing sign-in and trusted Admin account creation. The specific configuration patch is `{"disable_signup":true}`; do not overwrite other Auth settings. [Supabase configuration reference](https://supabase.com/docs/reference/api/v1-update-auth-service-config), [public signup guard](https://github.com/supabase/auth/blob/master/internal/api/signup.go), [trusted Admin creation](https://github.com/supabase/auth/blob/master/internal/api/admin.go).

Two pre-existing tracked ad-hoc test files, `scripts/test-auth-and-managers.js` and `scripts/test-final.js`, contain the currently configured service credential. Never execute them against production or reproduce their credential in reports, logs or new source. The user explicitly approved replacing and retiring the exposed credential on 29 October. The two ad-hoc scripts now read environment credentials and reject remote Supabase targets before any test runs. Do not silently rotate the JWT signing secret, invalidate staff sessions, change passwords or recreate accounts.

A replacement must first inventory every legitimate key consumer, stage updated private server/browser configuration, verify them, and only then retire the exposed legacy key. Supabase supports overlapping new publishable/secret keys and later legacy-key deactivation; old installed clients and any integrations must be accounted for. Deactivating legacy API keys is distinct from rotating Auth signing keys. The authorized security cutover is complete as documented below. [Supabase leaked-key procedure](https://supabase.com/docs/guides/getting-started/api-keys), [migration procedure](https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys), [signing-key implications](https://supabase.com/docs/guides/auth/signing-keys).

## Approved-release sequence

1. Obtain the final independent whole-change review and the user's concrete production release approval. Resolve the confirmed credential/public-signup conditions explicitly. Verify production still targets Supabase `gsxqrjywtugeuexrjcln` and the expected Vercel project. Record the exact reviewed Git revision, remote production revision, deployment and all current legitimate account IDs/roles privately.
2. Take a new backup and preservation baseline immediately before cutover, including original column lists, full rows, profile/Auth fields, constraints, triggers, policies and grants. Account for genuine daily operations since this rehearsal. Never restore an older backup over newer legitimate activity.
3. Prepare the compatible application build and configuration before beginning the brief pause. Use [manager-handover-pause.sql](manager-handover-pause.sql) only for the announced coordinated Farm-write pause. It adds named temporary triggers and changes no rows. Lock timeout is five seconds; an incomplete pause transaction rolls back. Check that reads and original logins remain available.
4. Submit the first migration with `operations.expected_profiles` set **in the same submitted SQL/session** to the freshly reviewed complete ID/role JSON array sorted by ID. Do not derive an unreviewed expected catalog inside the migration or reuse a separate MCP connection's session setting. Its profile-table lock rejects any intervening catalog change. New profile creation/role changes then pause in the database, covering older deployed clients as well as the new interface.
5. Apply the eight new forward migrations below in order. Never replay/edit original production migrations. The feature remains inactive; known legacy users retain their scope, missing setup fails closed, and new cash/physical-feed/provisioning operations stay blocked. Retain the Farm pause through the feeding-precision transition.
6. Stage and verify the compatible application against the expanded inactive schema, then promote that exact reviewed application/configuration with the feature still inactive. Do not publish an old application that lacks new-manager boundaries. Verify original reports, account controls and read-only branded routes.
7. Invoke the server-only `manager_period_write` activation using the verified active CEO actor. Shared provisioning and business locks establish a real activation timestamp; activation never creates source transactions or changes accounts. Verify feature availability, original record fingerprints, scopes and explicit closed-day protections. Run [manager-handover-resume.sql](manager-handover-resume.sql) only once the compatible application is verified. It removes only the exact temporary pause guard.
8. Verify the exact production commit/deployment and perform signed-in **read-only** CEO/manager checks. Existing records and ordinary account fields must still match, allowing genuine concurrent business activity and normal Auth session timestamps. No sample transactions, test manager provisioning or synthetic balances belong in production. Retain the existing tester because the latest instruction forbids deleting accounts.

Migrations:

1. `20261028120700_manager_periods_and_scope.sql`
2. `20261028122243_manager_scoped_writes.sql`
3. `20261028131020_manager_handover.sql`
4. `20261028140421_manager_feed_activity.sql`
5. `20261028201056_operations_cash_custody.sql`
6. `20261028203309_manager_cash_business_writes.sql`
7. `20261028221502_manager_reports_and_assignments.sql`
8. `20261029004043_legacy_manager_export.sql`

Read-only destinations: [CEO](https://leads.ultratidycleaning.com/dashboard), [Farm login](https://farm.primefieldagric.com/login), [Property login](https://leads.ultratidycleaning.com/property/login), [Content login](https://leads.ultratidycleaning.com/content/login), existing public UltraTidy/Primefield/DBA pages. Inspect automatic day-opening/handover behavior before visiting staff deep links; a GET-only check must not indirectly create live business records.

## Recovery limits

Keep every additive table, ownership link, receipt, audit and posted event. Daily feeding becomes NUMERIC; narrowing after fractional entries is unsafe. Newly cash-tracked sales use persisted currency precision; old unlinked totals retain their original precision. Never rebuild inventory or recalculate historical ledgers.

After activation, disabling the feature must pause guarded writes and retain personal scope; it cannot restore broad legacy access or allow untracked cash writes. New personal accounts must never reach the original production application without these boundaries. Prefer fixing forward with compatible code/configuration. Keep the named Farm pause active if the compatible application cannot be verified, and communicate the interruption explicitly. A rollback must never re-enable an exposed credential as a routine recovery step.

Missing historical spending and old unassigned cash recipients stay unmodified and visibly unallocated. Evidence-based historical attribution is a separately authorized operation, not an automatic part of this release. Social-account authorization remains an external setup step; live analytics contain only recorded observations.

## Authorized security cutover, 29 October 2026

Fresh pre-cutover backup is 768,044 bytes, SHA256 `83debf94598c941cc0ea8944269b93726f4e63b01d325c6fede91ec75a2cff77`. All 84 original tables, original column lists and complete source rows are retained privately; all eight profiles match the reviewed catalog. No Edge Functions, database HTTP consumers or scheduled database extensions were found. Vercel has one production environment for the shared application.

The Auth configuration was patched only with `disable_signup=true`; every other returned Auth setting remained identical. New named publishable and server secret keys passed read-only REST and trusted Auth-admin checks. Deployment configuration is being switched before legacy API-key deactivation. JWT signing keys, existing passwords and accounts are not rotated. Production application, all eight migrations, guarded activation and old-key rejection checks passed. Farm writes have resumed.

Credential cleanup verification: both ad-hoc scripts reject missing/production/other remote endpoints before client initialization, accept an isolated loopback preamble, and contain no exposed service credential in current tracked source. The old Git history is retained; revocation, rather than history rewriting, closes that exposure.

## Completed production verification

The tested production build `dpl_Gpe5ckwMLDCgrT1rwiP86rmZtZn9` (reviewed application source `bb53622474086cbdfdd2d1bcb39b7bf2a5921697`) was staged without live-domain assignment, verified, promoted and activated. The branded CEO domain independently resolved to that exact deployment. The named Farm pause ran from 21:30:19 to 21:37:08 UTC; zero pause guards remain. Existing reads and logins remained available. Four existing manager workspaces were captured as legacy; no personal account or source transaction was created.

All 49 original business tables retain their original row counts and complete-row fingerprints using their original columns. Original storage data also matches. All eight profile records and Auth identities/password hashes match. The only Auth baseline differences are the expected existing tester sign-in timestamp and its ordinary session, refresh-token and authentication-method records. No missing historical entry, opening balance, account attribution, stock quantity or financial amount was invented.

Sixteen signed-in API reads pass: accounts, existing CEO overview, Farm control report, all three manager contexts and custody summaries, Farm feed/balance/inventory, both approved managers' individual reports, Property and Content. Four authenticated CEO pages return 200. New reports correctly returned the intentional preparation response before activation and 200 afterwards. All three public sites, all four branded login routes and both additional app manifests return 200. The real legacy export implementation was independently verified in the earlier XLSX tests; no production financial test entry or new test account was submitted.

Public signup remains disabled with email login enabled. Production environment values and all four managed local checkouts use replacement publishable/server keys. Disabling legacy API keys alone did not reject their bearer-token form, which a read-only privileged probe caught. The project already used ES256 key `26a125a6-c25e-4f22-b5be-22b3f5429bc0` for current sign-ins. Only the retired, previously-used HS256 key was revoked; the current signing key was neither rotated nor replaced. The existing pre-retirement ES256 test session remains accepted. Old anon/service keys now return 401 both as API keys and as bearer tokens paired with the new public key; the new server's trusted Auth read returns 200. No passwords or users were recreated or changed. Open installed tabs should reload once to receive the new public configuration.

Supabase MCP assigned application times to the reviewed migration names. This mapping is release evidence, not permission to replay older files or blindly run `db push` over the repository's pre-existing migration drift:

| Reviewed file version/name | Applied version |
| --- | --- |
| 20261028120700 manager_periods_and_scope | 20261029213027 |
| 20261028122243 manager_scoped_writes | 20261029213033 |
| 20261028131020 manager_handover | 20261029213040 |
| 20261028140421 manager_feed_activity | 20261029213049 |
| 20261028201056 operations_cash_custody | 20261029213058 |
| 20261028203309 manager_cash_business_writes | 20261029213104 |
| 20261028221502 manager_reports_and_assignments | 20261029213112 |
| 20261029004043 legacy_manager_export | 20261029213118 |

The temporary named pause/resume steps are registered at `20261029213019` / `20261029213708`; they leave no pause function or trigger. Future migration tooling must reconcile verified versions separately before applying anything, rather than replaying these changes. Never re-enable the retired legacy signing key or expose replacement server keys as a rollback shortcut. The additive schema and original history remain intact.
