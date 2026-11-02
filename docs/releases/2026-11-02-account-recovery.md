# Account recovery hotfix

The recorded password-reset failure showed `Validation failed`. The form previously checked only length while the API also required an uppercase letter and number. Both now use the same schema, show requirements and specific errors, and retain the input on failure. The masked recording does not identify the particular missing requirement.

Removed accounts retain their email and identity. The new admin-only `POST /api/managers/[id]/restore` accepts `{reason, confirm_same_person:true}`. It restores account management while keeping the profile suspended and Auth banned. Bimbo reviews the same person's details, optionally resets their password, then explicitly uses Reactivate. A replacement manager needs a separate account and email; restoration never creates a fresh manager period or transfers history.

Restoration attempts are recorded in the existing immutable activity log through a new server-only audit function before Auth changes. Audit failure blocks restoration. The event describes a request, not a claim that restoration succeeded. A linked summary is stored in server-controlled Auth metadata with the removal-marker update. No password or token is logged. Failed restoration stays blocked and may be retried. A retry after successful restoration does not suspend a subsequently reactivated account. Existing metadata, roles and credentials are preserved. The additive migration creates only the guarded audit function, without backfills or historical row changes.

## Verification

Run the isolated manager account API, restoration API and browser suites, auth identity and app-update safety checks, lint, TypeScript and production build. Browser coverage includes 375, 390, 768 and 1440 pixels. Verify GitHub SHA, Vercel READY state and live version endpoint after release.

Verified: 133 account API checks, 176 restoration API checks, 23 database checks and 28 browser checks passed, along with auth identity and update safety tests. Private restored database rehearsal preserved fingerprints for all 134 public/Auth tables, including 27 Auth tables. Production migration `20261102221638_staff_restoration_audit.sql` preserved all eight profiles, eight accounts, aggregate credential fingerprints and 57 existing activity entries. Function execution is restricted to service_role.

## Operator instructions

1. Manage Accounts > Reset Password: follow the visible requirements; Update Password does not restore access.
2. For an accidentally removed account belonging to the same person: Restore access, confirm identity and give a reason. The account remains Suspended.
3. Review account details and select Reactivate when ready to allow sign-in.
4. Do not reuse the old identity for a different manager.

## Production boundaries and rollback

Deploying this patch does not reset any password, restore any account, correct any transaction or change inventory. Specific live restoration awaits the exact email and same-person confirmation. Test-entry cleanup awaits an identified and confirmed list, then uses existing audited corrections rather than deletion. Logo work and additional login-protection activation are excluded.

Apply and verify the additive audit migration before releasing the application. Rollback to the preceding verified Vercel deployment if required; retain audit events and metadata. The new unused function may remain after application rollback. No live account mutation is part of deployment verification. Bimbo's signed-in real-device acceptance remains outstanding.
