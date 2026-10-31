# App reliability, offline reports and update notices

## Scope

CEO and Farm login/layout recovery, independent dashboard errors, Expenses prominence and the approved Farm sidebar order. Shared manual WhatsApp contact in Farm, Property and Content opens +16478238262 only after a click; it sends no message or record automatically.

Daily Reports use one guarded transaction to create/update the draft, submit it, create any linked request and attach uploaded evidence. Original records remain unchanged. Offline entries retain their original date, actor/period, request identifier and photos until a valid server acknowledgement. Authentication/network failures remain retryable; business conflicts require resolution and an explicit retry of the original entry.

A prepared Farm workspace caches only its public shell and build assets. It never caches authenticated HTML or API responses. Locally retained work is shown only to the matching retained account identity. The real server scope is checked again before sending. First sign-in requires internet; phone background suspension can delay uploading until the app is reopened.

All four apps have version checks and Update available / Update now / Later / What's new. The running release is compared with the promoted release on the live domain. Editing, active writes, unreadable storage and incompatible saved entries block refresh. Other tabs are notified but are not forced to reload. Authentication and saved queues are never cleared to update.

## Security hold

The user explicitly chose to keep login-protection activation on hold. The tested policy and rollback-only SQL preparation are outside the migration path. No subscription, login counters, lockouts, recovery settings or account passwords were changed. See [the security activation prerequisites](../security/LOGIN-PROTECTION-ON-HOLD.md). This release does not claim complete direct-Supabase login protection.

## Preservation and release sequence

A fresh private production snapshot was restored locally. All original rows across 142 public/auth/storage tables matched before and after the additive function migration, including credential fields. All 62 current storage objects were downloaded separately with checksums. Private dumps, credentials, object files and preservation fingerprints remain outside Git.

1. Finish isolated database, API, actual browser, accounting and navigation checks, lint, TypeScript and production build. Review the complete diff.
2. Apply only the new daily_report_offline_submission migration. It adds a service-role-only wrapper around existing guarded operations. It does not backfill or update any table. Existing code remains compatible, so a write pause is not required for this function-only transition.
3. Push the reviewed commit to the production branch. Verify Vercel reaches READY for that exact commit and live domains point to it. Preview deployment status is not production evidence.
4. Confirm public login/version/worker responses without entering business transactions. Save deployment and preservation evidence privately.

Rollback: use a compatible application hotfix that retains the new submission endpoint. A pre-release build lacks that endpoint and must not be promoted once clients can have reports queued against it. Retain the additive function and all queued entries/photos. Do not remove the function while any client can have new report submissions queued. Do not restore an old database snapshot over current business records. The release-version endpoint follows the promoted deployment; already opened tabs must preserve their work before refreshing.

## Short acceptance checks for Bimbo and managers

1. Refresh once to receive this first release, then sign in on laptop and phone. Later releases will display the update notice while the app is open.
2. Check that Expenses is the first Farm quick action and sidebar sections follow the requested order. Purchases and Deliveries remains separate.
3. Prepare a real Daily Report while online. Add a camera or gallery photo. If connection drops, keep the draft; reopen the app when online and confirm Sent or Needs attention.
4. Review the same submitted report and its photos from the CEO dashboard. Do not create invented financial records for testing.
5. Check Message Bimbo opens the intended WhatsApp contact. The user still composes and sends the message.
6. When an update notice appears, verify Update now waits for saved work and current submissions. No other tab should lose its draft.

Physical-phone camera, installation and real authenticated live acceptance remain with Bimbo and the managers. The development checks use isolated data and browser transports, never demonstration transactions in production.
