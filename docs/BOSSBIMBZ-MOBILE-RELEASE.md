# October 8 authorized live release and mobile setup

User explicitly authorized the live Vercel/database update on October 8. This supersedes the earlier release-approval gate; preservation, backup and coordinated verification still apply.

Property and Content now have independent installable web-app identities, standalone launch URLs, scoped network-only workers, 192/512 icons and Apple home-screen metadata, covering login and workspace routes. Installation state/dismissal belongs to each app rather than sharing Farm's key. Chromium installation uses the browser's eligible native event and a user click; iPhone/iPad uses Share/Add to Home Screen guidance, with Safari fallback. Android browsers without a native event receive menu guidance. Installed mode hides prompts; blocked device storage does not crash installation. The banner reserves scrolling room so controls remain reachable. Browser/OS eligibility and user choice cannot be bypassed.

No worker caches private pages, tokens or business API responses. Operational records require connectivity. Static manifests/workers are public exact-path assets, bypassing host-based protected-route rewrites; private application routes retain their guards.

Verified: 22 manifest/metadata/worker contracts, 14 actual install-component browser checks, 88 actual middleware cases including host-specific asset access, full lint/build and 23 built expansion GET checks. Existing Property/Content responsive workflow evidence remains applicable; the install card was inspected at mobile size. Tests simulate browser capability and are not a claim that an OS installation was performed on Bimbo's phone.

Release backup is private outside Git at `C:/Users/USER/.codex/backups/bossbimbz-release-2026-10-08`. The missing saved password was overcome using Supabase's supported temporary CLI login, stepping down to the authorized PostgreSQL role; no application account or master database password was reset. A fresh complete archive was captured, including account data. Its hash is recorded privately. The restore/rehearsal and coordinated live outcome are recorded below when completed.

The first production-environment build was staged with domain promotion skipped. Vercel's generated project alias was restored to the previous verified deployment while preparing the coordinated migration. Branded live domains remain on the previous version until promotion. No guessed feed opening counts or real social authorizations are introduced during release.
