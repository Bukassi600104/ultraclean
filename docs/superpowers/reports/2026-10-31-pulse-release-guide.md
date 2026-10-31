# Primefield Pulse: prepared release and rollback guide

Application implementation commit: `02bcbe6` on `codex/primefield-pulse`. This document does not authorize or claim a production release. No production migration, push, deployment, account creation or financial test transaction was performed in this implementation stage.

## Before the approved production release

1. Confirm the Vercel project, production branch, domains and Supabase project `gsxqrjywtugeuexrjcln` still match the deployment. Check current migration names and live function signatures. Do not use an unrestricted database push that replays older local migrations: the live history differs from local filenames.
2. Capture a fresh consistent private backup immediately before release, including current Auth data. The October30 rehearsal snapshot is evidence of migration behavior, not a replacement for today's active records. Separately protect Storage object bytes; SQL backups include metadata only.
3. Rehearse the exact final migrations against that restored backup. Compare original rows/columns and Auth/password hashes. Stop on unexplained drift. Keep the original dump and comparison output outside Git.
4. Prepare compatible Vercel build and verify its environment variable names without printing values. An isolated preview must use isolated database/storage credentials; never expose production data to clear a preview build.
5. Agree a brief Farm-write pause covering money, sales, stock, feeding and offline resubmission while schema/app compatibility is switched. Keep reads available where possible. Use an explicitly scoped maintenance/write filter; do not treat `operations_release_state.enabled` as a universal write pause or reset manager periods. Queued submissions must retain their original dates and IDs.

## Exact forward migration order

These are new, unreleased migration files in this branch. Do not edit or replay the original deployed Farm migrations. SHA256 below is for the checked-in file bytes.

| Order | File | SHA256 |
| --- | --- | --- |
| 1 | `20261030155050_primefield_named_batches.sql` | `5cf5932a552b280a6bc3a676edb5c3052209233543bc11254fa26d48cb170200` |
| 2 | `20261030161441_primefield_private_evidence.sql` | `5c7194b5e8a489f2db6fac87015dd2dbae383d74691370f3e8283a1c3a21ba00` |
| 3 | `20261030162806_primefield_batch_records.sql` | `f9977180d0c1038edf870a276c6863db4a99751d56eecc0cb2030d5e19481354` |
| 4 | `20261030215113_primefield_purchase_workflow.sql` | `c37a36ce195d235c95f5eb6e8bc9d45f0664e72837cd1ddad857ff64737f8ebc` |
| 5 | `20261030222246_primefield_stores_counts.sql` | `8645bf55f93e94997cb484529ae985f4af5a5bcc3daf47da23bcea1c7164c1f5` |
| 6 | `20261030230000_primefield_customer_credit.sql` | `e0876b88da0b3c87b232db06a714fc5e354c638ab5e481e26c733f8baa5a53fa` |
| 7 | `20261030232000_primefield_health_performance.sql` | `346b00beb21d7c9f50b853951c1b333f017edba98215bb4eb8e999c19a20980d` |
| 8 | `20261031001000_primefield_control_reporting.sql` | `7902fcea930d3cb837cd765a21e872bd0de66dca31d4ef40b86db19d2b418791` |
| 9 | `20261031010000_primefield_support_access.sql` | `f709527449c7d86270834dcdaa67390a9e2b089b1428252591822e6e2905b918` |

Each file wraps its change in a transaction with a short lock timeout and documents preconditions/rollback limits. A timeout is a failed migration to investigate, not permission to remove the locking protection. Record each successful migration in the deployment's migration history.

## Application switch and validation

1. Apply the nine reviewed migrations in order during the approved pause. Leave `purchasing_enabled=false` initially. Do not modify the existing `enabled`, activation metadata, manager periods, assignments or balances.
2. Deploy the compatible application commit to the exact production Vercel project and confirm the successful deployment is aliased to the live domains. A Git push or a successful preview is not proof of production rollout.
3. Perform read-only sign-in/session, CEO overview, manager scope, source record, inventory, report and eligible export checks. Compare figures against the freshly captured source snapshot, allowing only explained normal activity and Auth session changes. Verify the private `farm-evidence` bucket remains private.
4. After compatible application verification, enable the purchasing transition once in the approved production database: `update public.operations_release_state set purchasing_enabled=true where id=true;`. This changes routing policy, not historical purchases, figures or accounts. Check one affected row. Preserve existing pending funding and queued old submissions for review.
5. Remove the scoped Farm-write pause only after these checks pass. Bimbo and managers then perform their agreed real-phone/user acceptance. No demonstration transactions or temporary production test accounts are needed.
6. Record final application commit, Vercel deployment ID/URL, database migration versions, validation results and the time the pause ended. Until this record exists, do not tell users the update is live.

## Configuration after release

Use the existing CEO account/assignment controls. Optional vet/accountant accounts start with no grants. Assign only the approved health batches or finance periods. Existing account passwords and historical export eligibility are unchanged.

No automatic purchase policy, credit term, mortality threshold, egg crate size, bag weight or currency rate is fabricated. Bimbo records genuine configuration as needed. Existing managers retain legacy cash semantics until she explicitly starts a personal responsibility period.

Copyable summaries, complete Excel and browser Print/PDF work without a messaging provider. Automated WhatsApp/email stays disabled until genuine sender, recipient, schedule and scheduler credentials are configured. See [reporting and delivery](2026-10-31-pulse-reporting-delivery.md).

## Rollback limits

Never restore the old production dump over new business activity. Never rebuild stock, reset balances, rewrite historical attribution or delete the new records to undo the release.

Before new Pulse activity, the additive schema can remain dormant while routing is investigated. After activity begins, retain the new tables, invoice/receipt distinctions, assignment boundaries, evidence links, compensating movements and audit records. A broadly scoped old app must not replace the scoped app for personal manager accounts. Prefer a forward fix. If a compatible prior application version is chosen, verify its guarded writes and reads against the retained schema before resuming entry.

Commercial credits preserve original receipts and allocation history. An actual refund is a separate cash event; credited physical returns do not automatically add stock. Record an actual returned animal/item through the guarded stock workflow rather than inventing a retrospective movement.

## Acceptance ownership

Bimbo and managers own the final live phone/install/camera/keyboard/offline usability acceptance, as requested. Local browser emulation and synthetic concurrency tests are not claims of physical-device or production-provider testing. See [staff guide](2026-10-31-primefield-staff-guide.md).
